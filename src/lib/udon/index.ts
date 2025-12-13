import { UdonShopClassifier } from "./UdonShopClassifier";

/**
 * "a,b,c" のようなCSV文字列を Set<string> にする
 * - 空文字/未指定は空Set
 * - 前後空白は trim
 */
function parseIdSet(env?: string) {
  if (!env) return new Set<string>();
  return new Set(env.split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * "a,b,c" のようなCSV文字列を string[] にする（正規表現パターン等に使う）
 * - 空文字/未指定は undefined を返して「デフォルト設定を使う」
 */
function parseCsvList(env?: string): string[] | undefined {
  const list = (env ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

/**
 * うどん判定器

 */
export const udonClassifier = new UdonShopClassifier({
  // 香川県以外を落としたいなら true（.env で上書き可能）
  requireKagawaAddress:
    (process.env.UDON_REQUIRE_KAGAWA ?? "true").toLowerCase() === "true",

  // 必要なら .env で上書きできる（例：UDON_ALLOWLIST=xxx,yyy）
  allowPlaceIds: parseIdSet(process.env.UDON_ALLOWLIST),
  denyPlaceIds: parseIdSet(process.env.UDON_DENYLIST),
});
