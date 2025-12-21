export type PlaceLike = {
  placeId?: string | null;
  name?: string | null;
  types?: string[] | null;
  address?: string | null;
};

export type Classification = {
  isUdon: boolean;
  reasons: string[];

  // ログ用: どのパターンにヒットしたか
  matchedInclude?: string[];
  matchedExclude?: string[];
};

type Options = {
  // うどん判定キーワード
  includeNamePatterns?: RegExp[];
  // うどん確証キーワード（即OK）
  includeStrongNamePatterns?: RegExp[];
  // 明らかに別業態キーワード
  excludeNamePatterns?: RegExp[];
  // 明らかに別業態 type
  excludeTypePatterns?: RegExp[];

  // 飲食店っぽい type の最低条件
  foodTypes?: string[];

  // 香川県フィルタを入れるか
  requireKagawaAddress?: boolean;

  // 強制許可/拒否（placeIdベース）
  allowPlaceIds?: Set<string>;
  denyPlaceIds?: Set<string>;

  /**
   * 厳しさ調整
   * true: include が当たらない場合は foodTypes を必須にする（混入減）
   * false: include が当たらない場合は exclude のみで落とす（取りこぼし減）
   */
  requireFoodTypeWhenNoInclude?: boolean;
};

export class UdonShopClassifier {
  private includeNamePatterns: RegExp[];
  private includeStrongNamePatterns: RegExp[];
  private excludeNamePatterns: RegExp[];
  private excludeTypePatterns: RegExp[];
  private foodTypes: string[];
  private requireKagawaAddress: boolean;
  private allowPlaceIds: Set<string>;
  private denyPlaceIds: Set<string>;
  private requireFoodTypeWhenNoInclude: boolean;

  constructor(opts: Options = {}) {
    this.includeNamePatterns = opts.includeNamePatterns ?? [
      /うどん/,
      /饂飩/,
      /\budon\b/i,
    ];
    this.includeStrongNamePatterns = opts.includeStrongNamePatterns ?? [
      /うどん/,
      /饂飩/,
      /\budon\b/i,
    ];

    // 主要な非うどん系キーワード（必要に応じて追加）
    this.excludeNamePatterns = opts.excludeNamePatterns ?? [
      /ラーメン/,
      /そば/,
      /蕎麦/,
      /カフェ/,
      /喫茶/,
      /バー/,
      /バル/,
      /焼肉/,
      /寿司/,
      /中華/,
      /パン/,
      /お好み焼/,
      /そうめん/,
      /らぁ麺/,
      /ステーキ/,
      /台湾料理/,
      /たこ焼/,
      /珈琲/,
      /PIZZERIA/i,
      /焼鳥/,
      /駐車場/,
      /土産販売所/,
    ];
    this.excludeTypePatterns = opts.excludeTypePatterns ?? [
      /cafe/i,
      /coffee/i,
      /bar/i,
      /bakery/i,
      /night_club/i,
      /liquor_store/i,
      /convenience_store/i,
      /department_store/i,
      /supermarket/i,
      /spa/i,
      /lodging/i,
    ];

    this.foodTypes = opts.foodTypes ?? [
      "restaurant",
      "food",
      "meal_takeaway",
      "meal_delivery",
    ];

    // 既定は false。運用は true 推奨（index.ts側でtrueにしてOK）
    this.requireKagawaAddress = opts.requireKagawaAddress ?? false;

    this.allowPlaceIds = opts.allowPlaceIds ?? new Set();
    this.denyPlaceIds = opts.denyPlaceIds ?? new Set();

    // デフォルトは true（混入を減らす）
    this.requireFoodTypeWhenNoInclude = opts.requireFoodTypeWhenNoInclude ?? true;
  }

  /**
   * どの正規表現に当たったかを文字列で返す（ログ用）
   */
  private matchPatterns(patterns: RegExp[], text: string): string[] {
    const hits: string[] = [];
    for (const re of patterns) {
      try {
        if (re.test(text)) hits.push(String(re));
      } catch {
        // 壊れた正規表現がいても落とさない
      }
    }
    return hits;
  }

  private isKagawaAddress(address: string) {
    const a = address ?? "";
    return a.includes("香川県") || a.toLowerCase().includes("kagawa");
  }

  classify(p: PlaceLike): Classification {
    const reasons: string[] = [];
    const placeId = (p.placeId ?? "").trim();

    // 強制許可/拒否
    if (placeId && this.allowPlaceIds.has(placeId)) {
      return {
        isUdon: true,
        reasons: ["allowlist"],
        matchedInclude: ["allowlist"],
      };
    }
    if (placeId && this.denyPlaceIds.has(placeId)) {
      return {
        isUdon: false,
        reasons: ["denylist"],
        matchedExclude: ["denylist"],
      };
    }

    const name = (p.name ?? "").trim();
    const types = (p.types ?? []) as string[];
    const address = (p.address ?? "").trim();

    // 香川県縛り
    if (this.requireKagawaAddress) {
      if (!this.isKagawaAddress(address)) {
        return { isUdon: false, reasons: ["not kagawa"] };
      }
      reasons.push("kagawa ok");
    }

    const matchedIncludeStrong = this.matchPatterns(
      this.includeStrongNamePatterns,
      name
    );
    const matchedInclude = this.matchPatterns(this.includeNamePatterns, name);
    const matchedExclude = this.matchPatterns(this.excludeNamePatterns, name);
    const matchedExcludeTypes = this.matchPatterns(
      this.excludeTypePatterns,
      types.join(" ")
    );

    const hasIncludeStrong = matchedIncludeStrong.length > 0;
    const hasExclude = matchedExclude.length > 0;
    const hasExcludeType = matchedExcludeTypes.length > 0;

    // 確証キーワードは即OK
    if (hasIncludeStrong) {
      reasons.push("strong include keyword");
      if (hasExclude || hasExcludeType) reasons.push("exclude matched but include wins");
      return {
        isUdon: true,
        reasons,
        matchedInclude: [...matchedIncludeStrong, ...matchedInclude],
        matchedExclude: [...matchedExclude, ...matchedExcludeTypes],
      };
    }

    // include が無い場合は混入しやすいゾーン
    if (hasExclude || hasExcludeType) {
      return {
        isUdon: false,
        reasons: ["exclude matched"],
        matchedInclude,
        matchedExclude: [...matchedExclude, ...matchedExcludeTypes],
      };
    }

    const looksFood = types.some((t) => this.foodTypes.includes(t));
    if (this.requireFoodTypeWhenNoInclude && !looksFood) {
      return {
        isUdon: false,
        reasons: ["no include keyword", "not food types"],
        matchedInclude,
        matchedExclude,
      };
    }

    if (looksFood) reasons.push("food types ok");

    return {
      isUdon: true,
      reasons: [...reasons, "no include keyword (tentative allow)"],
      matchedInclude,
      matchedExclude,
    };
  }
}
