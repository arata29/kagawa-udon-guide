export type PlaceLike = {
  placeId?: string | null;
  name?: string | null;
  types?: string[] | null;
  address?: string | null;
};

export type Classification = {
  isUdon: boolean;
  reasons: string[];

  // ✅ ログ用：どのパターンにヒットしたか（後で調整しやすい）
  matchedInclude?: string[];
  matchedExclude?: string[];
};

type Options = {
  // うどん判定のキーワード
  includeNamePatterns?: RegExp[];
  // 明らかに別業態のキーワード
  excludeNamePatterns?: RegExp[];

  // 飲食店っぽいtype（最低条件）
  foodTypes?: string[];

  // 香川県フィルタを入れるか（必要なら）
  requireKagawaAddress?: boolean;

  // 強制許可/拒否（placeIdベース）
  allowPlaceIds?: Set<string>;
  denyPlaceIds?: Set<string>;
  
   /**
   * ✅ 厳しさ調整（任意）
   * true: include が当たらない店は「foodTypes に当たること」を必須にする（混入減）
   * false: include が当たらない店は「exclude だけで落とす」寄り（取りこぼし減）
   */
  requireFoodTypeWhenNoInclude?: boolean;
};

export class UdonShopClassifier {
  private includeNamePatterns: RegExp[];
  private excludeNamePatterns: RegExp[];
  private foodTypes: string[];
  private requireKagawaAddress: boolean;
  private allowPlaceIds: Set<string>;
  private denyPlaceIds: Set<string>;
  private requireFoodTypeWhenNoInclude: boolean;

  constructor(opts: Options = {}) {
    this.includeNamePatterns = opts.includeNamePatterns ?? [
      /うどん/,
      /\budon\b/i,
    ];

    this.excludeNamePatterns = opts.excludeNamePatterns ?? [
      /ラーメン/,
      /そば/,
      /蕎麦/,
      /カフェ/,
      /喫茶/,
      /バー/,
      /居酒屋/,
      /焼肉/,
      /寿司/,
      /中華/,
      /パン/,
      /お好み焼/,
      /ところてん/,
      /餃子/,
      /そうめん/,
      /らぁ麺/,
      /ステーキ/,
      /台湾料理/,
      /たこやき/,
      /珈琲/,
      /PIZZERIA/,
      /焼鳥/,
      /駐車場/,
      /土産販売所/,

      /すき家/,
      /道草/,
      /天ぷら ばぁばん家/,
      /CHOIKAPPO 田舎者/,
      /MilkyCafe/,
      /愛梨香/,
      /ブッフェレストラン シエル/,
      /小見立/,
      /井上誠耕園 忠左衛門/,
      /ごはんどき 善通寺店/,
      /樹ノ一/,
      /宿月/,
      /真砂喜之助製麺所/,
      /アイランドコニシ製麺/,
      /レストラン グリル山/,
      /シェフ かわぐち/,
      /いろり屋/,
      /和DINING 讃岐亭/,
      /マルカツ製麺所/,
      /西ん家/,
      /つくだに屋さん/,
      /徳山製麺/,
      /まめまめびーる/,
      /木原食堂/,
      /日本料理 島活/,
      /食堂 美奈都/,
      /こまめ食堂/,
      /ひかり/,
      /お食事処 つるぎ/,
      /麺処 たでや/,
      /囲炉裏 さぬき路/,
      /青竜亭/,
      /幸楽/,
      /SETOUCHI たいにんぐ/,
      /吾割食堂 宇多津店/,
      /いたずらたまご/,
      /海鮮食堂/,
      /まんぷく亭/,
      /とおりゃんせ/,
      /ひだまり/,
      /古民家食堂 てつや/,
      /天ぷら割烹 ます梅/,
      /多度津 ごはん MARU/,
      /そらとたべるthreee/,
      /上海軒/,
      /家中舎/,
      /シェ ヨコイ/,
      /とり蔵/,
      /マヨたこ/,
      /エビス屋/,
      /川崎屋/,
      /骨付き鳥 味鶴/,
      /お食事処そら/,
      /とんぼり/,
      /手延べ麺お食事処 銀四郎/,
      /かりえん/,
      /のり家/,
      /トマトの木/,
      /B-Dine/,
      /ブォン コンパーニョ/,
      /ちりめん家/,
      /ASLY/,
      /木場製麺所/,
      /タカにゃん食堂/,
      /海のレストラン/,
      /食堂101号室/,
      /シーサイド/,
      /味彩/,
      /四川/,
      /がばちょ/,
      /オリヴァス/,
      /呑み処 志露人/,
      /吉岡製麺所/,
      /手延べ素麺 なかぶ庵/,
      /京宝亭/,
      /麺鯉/,
      /すみれ/,
      /てっぱんこなこな/,
      /ﾚｽﾄﾗﾝ【サン･オリーブ】/,
      /食事処うめもと/,
      /ウチンク/,
      /クッキングマーカス/,
      /オリーブパレス レストレア/,
      /楓/,
      /丸善製麵/,
      /ちゅうかさいかん/,
      /宇夫階神社/,
      /味感 真寿美/,
      /こっこハウス綾川［たまご無人販売所］/,
      /まさご屋 すする/,
      /新食堂/,
      /つくし食堂/,
      /飩餃/,
      /千疋の丘～空と風のテラス/,
      /ROKA♠︎/,
      /新開/,
      /めん六や三木店/,
      /大衆酒場 ばろん/,
      /にしきや/,
      /創麺屋/,
      /Sando Sand. Stand/,
      /ハニー雷蔵/,
      /お食事処 ひとし/,
      /ドライブイン シラカバ/,
      /藤の家 食堂/,
      /旬和快席 欅/,
      /コン・タパス/,
      /天狗堂土産物店/,
      /ヒョーキン/,
      /JAPANESE WHISKEY BAR 729&美味処 寿/,
      /いえもんや/,
      /おいで家/,
      /藤井製麺/,
      /sou sou/,
      /うまいもん屋 庄八/,
      /三木義忠製麺所/,
      /小豆島三木製麺/,
      /筍の里/,
      /レストラン オリーブ/,
      /しゃぶ葉/,
      /果桜軒/,
      /お食事処 グルーメ/,
      /美山 イオンモール綾川店/,
      /ヨナキヤ本舗/,
      /海食処 笑門家/,
      /キャトルセゾン/,
      /中国麺/,
      /お食事処だいぢ/,
      /さぬき名物骨付鳥 田中屋 琴平店/,
      /礎/,
      /彩葉(いろは)/,
      /長栄堂本店/,
      /食事処 こめや/,
      /瀬戸内讃岐工房㈱ 財田支社/,
      /酒蔵 本陣/,
      /Cafe 醤/,
      /ベリーレレ/,
      /入舟/,
      /うましの/,
      /ワーサン亭/,
      /母の屋/,
      /LA FRESCA/,
      /活魚料理 讃岐家/,
      /わんはかせ/,
      /Crispy JIJI Chickenこんぴら おいり横丁/,
      /えびす屋/,
      /食堂おおや/,
      /Sanu/,
      /きたさん/,
      /福味/,
      /鰻の成瀬/,
      /ふみむらのぎょうざ/,
      /まつ本/,
      /魚源/,
      /手延そうめん館/,
      /うす家/,
      /とんかつ 豚ゴリラJr./,
      /坂出市/,
      /ぶうにゃん/,
      /おいり横丁/,
      /萩の茶屋/,
      /海鮮処 蒼幡 〜アオハタ〜 ex.アオハタ鮮魚店/,
      /道の駅 小豆島ふるさと村/,
      /かえるのこ/,
      /手延べそうめん学校/,
      /ばいこう堂/,
      /ほくろ屋菓舗/,
      /とん平/,
      /イオンモール/,
      /中丸水産/,
      /和食甘味やましな/,
      /以志や/,
      /かねこ屋/,
      /Italiano giorno felice/,
      /麻心/,
      /うえまつ食堂/,
      /アクアベル/,
      /塩飽の漁師飯 まや/,
      /一鶴/,
      /大乃原/,
      /とりあたま 丸亀本店/,
      /吉野家/,
      /旭乃陣/,
      /あたりや/,
      /ポルティヴィア パッソ/,
      /小松屋/,
      /燈馬/,
      /ウェリントン/,
      /一粒/,
      /お結び にぎやか さゆりん/,
      /大川オアシス/,
      /レストラン みろく/,
      /沖縄弁当とサーターアンダギーのお店 385みゃーく/,
      /ふくろう/,
      /帰ってきたバカ息子/,
      /食処ゆとり/,
      /くうかい高瀬/,
      /彩葉茶屋/,
      /春夏秋冬/,
      /善乃家/,
      /善通寺 構内食堂/,
      /八つ刻 醍醐/,
      /お食事処 鹿野/,
      /長谷川米穀店/,
      /げんきや食堂/,
      /とくしげ/,
      /みどり食堂/,
      /MINORI GELATO/,
      /松村食堂/,
      /家食屋ほんてん/,
      /らあめんや善通寺/,
      /麺匠 いりこや/,
      /ジョイフル/,
      /朔日/,
      /三原茶屋/,
      /参道えび 海老乃家 こんぴら店/,
      /いろは/,
      /浜一食堂/,
      /びんび三昧 坂出インター店/,
      /MIROC BREWERY/,
      /鶏笑門/,
      /おむすび座/,
      /レストラン三木/,
      /中華料理 薔薇飯店/,
      /お食事処 和平（かずへい）/,
      /御食事処 西竹/,
      /七福ホルモン/,
      /王将食堂/,
      /花まる/,
      /にこいち/,
      /熊八/,
      /しおはまの湯/,
      /浜海道 多度津本店/,
      /碧い空/,
      /たこ判 たかはた/,
      /麺処ぐり虎/,
      /さぶちゃん/,
      /お食事処花橘/,
    ];

    this.foodTypes = opts.foodTypes ?? [
      "restaurant",
      "food",
      "meal_takeaway",
      "meal_delivery",
      "cafe", // cafeが混ざるのが嫌なら外してOK
    ];

    // 既定は false だと混入が増えるので、運用は true 推奨（index.ts 側でtrueにしてるのでOK）
    this.requireKagawaAddress = opts.requireKagawaAddress ?? false;

    this.allowPlaceIds = opts.allowPlaceIds ?? new Set();
    this.denyPlaceIds = opts.denyPlaceIds ?? new Set();

    // ✅ デフォは true 推奨（混入を減らす）
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
      return { isUdon: true, reasons: ["allowlist"], matchedInclude: ["allowlist"] };
    }
    if (placeId && this.denyPlaceIds.has(placeId)) {
      return { isUdon: false, reasons: ["denylist"], matchedExclude: ["denylist"] };
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

    // ✅ include / exclude のヒット内容を取る（ログ用）
    const matchedInclude = this.matchPatterns(this.includeNamePatterns, name);
    const matchedExclude = this.matchPatterns(this.excludeNamePatterns, name);

    const hasInclude = matchedInclude.length > 0;
    const hasExclude = matchedExclude.length > 0;

    // ✅ 重要：店名に「うどん」が入っているなら、exclude に当たっても基本は救う
    // （ユーザー要望：うどんという文字があれば False にしたくない）
    if (hasInclude) {
      reasons.push("name includes udon");

      // ただし「明らかに別業態」も混ざるなら、ここで “注意” として reasons に残すだけにする
      if (hasExclude) reasons.push("exclude matched but include wins");

      // foodTypes が完全に関係ない（例: park など）なら落としたい場合の保険
      const looksFood = types.some((t) => this.foodTypes.includes(t));
      if (!looksFood) {
        // includeが強いので「即落とし」ではなく、運用で調整できるよう理由を残して落とす
        return {
          isUdon: false,
          reasons: [...reasons, "not food types (include matched but types not food)"],
          matchedInclude,
          matchedExclude,
        };
      }

      return { isUdon: true, reasons, matchedInclude, matchedExclude };
    }

    // include が無い場合は混入しやすいゾーン
    // 1) exclude に当たるなら落とす
    if (hasExclude) {
      return {
        isUdon: false,
        reasons: ["name matched exclude keyword"],
        matchedInclude,
        matchedExclude,
      };
    }

    // 2) types を使って「飲食店っぽい」なら暫定OK（取りこぼし軽減）
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

    // 3) ここまで来たら「うどん確証はないが、飲食店っぽいので一旦OK」
    //    → 取りこぼしは減るが混入は増える。混入が多いなら requireFoodTypeWhenNoInclude を true のままにし、
    //      exclude を強化する運用がしやすい。
    return {
      isUdon: true,
      reasons: [...reasons, "no include keyword (tentative allow)"],
      matchedInclude,
      matchedExclude,
    };
  }
}
