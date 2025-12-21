import fs from "node:fs";
import path from "node:path";
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

function parseRegexToken(token: string): RegExp | null {
  if (!token) return null;
  const trimmed = token.trim();
  const m = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
  try {
    if (m) return new RegExp(m[1], m[2]);
    return new RegExp(trimmed);
  } catch {
    return null;
  }
}

function loadRegexCsv(relPath: string): RegExp[] | undefined {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return undefined;

  const text = fs.readFileSync(filePath, "utf8");
  const patterns: RegExp[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    for (const token of trimmed.split(",")) {
      const re = parseRegexToken(token);
      if (re) patterns.push(re);
    }
  }

  return patterns.length ? patterns : undefined;
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
  includeNamePatterns: loadRegexCsv("config/udon-include.csv"),
  excludeNamePatterns: loadRegexCsv("config/udon-exclude.csv"),
});
