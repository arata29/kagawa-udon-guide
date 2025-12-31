import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { udonClassifier } from "../src/lib/udon";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 1回の同期で出力するログ(JSONL)の保存先を作る
 */
function createRunLogger() {
  const dir = path.join(process.cwd(), "logs");
  fs.mkdirSync(dir, { recursive: true });

  const ts = new Date();
  const stamp = [
    ts.getFullYear(),
    String(ts.getMonth() + 1).padStart(2, "0"),
    String(ts.getDate()).padStart(2, "0"),
    "_",
    String(ts.getHours()).padStart(2, "0"),
    String(ts.getMinutes()).padStart(2, "0"),
    String(ts.getSeconds()).padStart(2, "0"),
  ].join("");

  const file = path.join(dir, `sync_details_${stamp}.jsonl`);
  const stream = fs.createWriteStream(file, { flags: "a" });

  cleanupRunLogs(dir, 10); // 古いログを10世代だけ残して削除

  const write = (obj: unknown) => {
    // 1行1JSON（JSONL）
    stream.write(JSON.stringify(obj) + "\n");
  };

  const close = () =>
    new Promise<void>((resolve) => {
      stream.end(() => resolve());
    });

  return { file, write, close };
}

function cleanupRunLogs(dir: string, keep: number) {
  const files = fs
    .readdirSync(dir)
    .filter((name) => /^sync_details_\d{8}_\d{6}\.jsonl$/.test(name))
    .sort()
    .reverse();

  for (const name of files.slice(keep)) {
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch {
      // noop
    }
  }
}

type Details = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  types?: string[];

  regularOpeningHours?: {
    periods?: {
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }[];
    weekdayDescriptions?: string[];
  };
  utcOffsetMinutes?: number;

  // reviews はコストが増えるため、必要なときだけ取得する想定
  reviews?: { text?: { text?: string } }[];
};

const USE_REVIEWS = false; // false にするとレビュー要約を作らない（クレジット節約）

async function fetchDetails(placeId: string): Promise<Details | null> {
  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=ja&regionCode=JP`;

  // FieldMask は必要なものだけ
  const fieldMaskBase =
    "id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri,types,regularOpeningHours,utcOffsetMinutes";
  const fieldMask = USE_REVIEWS ? `${fieldMaskBase},reviews` : fieldMaskBase;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Details ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as Details;
}

/**
 * formattedAddress から市町村をざっくり抽出
 * - 日本語: "香川県高松市.." or "香川県 綾川町..."
 * - 英語: "Takamatsu, Kagawa ..."
 */
function extractArea(address?: string | null) {
  if (!address) return null;

  const jp = address.match(/香川県\s*([^\d\s,]+?(?:市|町|村))/);
  if (jp?.[1]) return jp[1];

  const en = address.match(/\b([^,]+)\s*,\s*Kagawa\b/i);
  if (en?.[1]) return en[1].trim();

  return null;
}


const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;

const toMinutes = (hour?: number, minute?: number) =>
  (hour ?? 0) * 60 + (minute ?? 0);

const toWeekMinutes = (day?: number, minutes?: number) =>
  (day ?? 0) * MINUTES_IN_DAY + (minutes ?? 0);

const computeOpenDays = (openingHours?: Details["regularOpeningHours"] | null) => {
  const periods = openingHours?.periods ?? [];
  if (periods.length === 0) return [] as number[];

  const days = new Set<number>();
  for (const period of periods) {
    const open = period.open;
    const close = period.close;
    if (!open || !close || open.day == null || close.day == null) continue;

    const openMinutes = toMinutes(open.hour, open.minute);
    const closeMinutes = toMinutes(close.hour, close.minute);
    let openWeek = toWeekMinutes(open.day, openMinutes);
    let closeWeek = toWeekMinutes(close.day, closeMinutes);

    if (closeWeek <= openWeek) {
      closeWeek += MINUTES_IN_WEEK;
    }

    const overlaps = (start: number, end: number) =>
      openWeek < end && closeWeek > start;

    for (let day = 0; day < 7; day += 1) {
      const dayStart = day * MINUTES_IN_DAY;
      const dayEnd = dayStart + MINUTES_IN_DAY;
      if (
        overlaps(dayStart, dayEnd) ||
        overlaps(dayStart + MINUTES_IN_WEEK, dayEnd + MINUTES_IN_WEEK)
      ) {
        days.add(day);
      }
    }
  }

  return Array.from(days).sort((a, b) => a - b);
};

/**
 * AIなしで“それっぽく”まとめる簡易レビュー要約
 * - 形態素解析は使わず、キーワード辞書で言及が多い観点を箇条書きにする
 */
function summarizeReviewsJaFree(reviews: string[]) {
  const cleaned = reviews
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((t) => (t.length > 240 ? t.slice(0, 240) + "…" : t));

  if (cleaned.length === 0) return null;

  const aspects: { key: string; label: string; keys: RegExp[] }[] = [
    { key: "noodle", label: "麺（コシ/食感）", keys: [/麺/, /コシ/, /もちもち/, /つるつる/, /食感/] },
    { key: "dashi", label: "出汁・つゆ", keys: [/出汁|だし/, /つゆ/, /だし味/, /スープ/] },
    { key: "price", label: "値段・コスパ", keys: [/安い/, /高い/, /コスパ/, /値段/, /価格/, /料金/] },
    { key: "volume", label: "量（ボリューム）", keys: [/量/, /ボリューム/, /大盛/, /普通/, /並/] },
    { key: "service", label: "接客・雰囲気", keys: [/接客/, /店員/, /対応/, /雰囲気/, /店内/] },
    { key: "queue", label: "混雑・待ち時間", keys: [/行列/, /混雑/, /待ち/, /並ぶ/, /回転/] },
    { key: "parking", label: "駐車場・アクセス", keys: [/駐車場/, /アクセス/, /近い/, /遠い/] },
  ];

  const POS = [/美味しい/, /うまい/, /最高/, /良い/, /満足/, /おすすめ/, /好き/, /丁寧/, /親切/];
  const NEG = [/まずい/, /微妙/, /残念/, /不満/, /高い/, /遅い/, /愛想(が)?悪い/, /汚い/, /狭い/];

  const stats = new Map<string, { label: string; hit: number; pos: number; neg: number }>();
  for (const a of aspects) stats.set(a.key, { label: a.label, hit: 0, pos: 0, neg: 0 });

  for (const text of cleaned) {
    const isPos = POS.some((re) => re.test(text));
    const isNeg = NEG.some((re) => re.test(text));

    for (const a of aspects) {
      if (a.keys.some((re) => re.test(text))) {
        const s = stats.get(a.key)!;
        s.hit += 1;
        if (isPos) s.pos += 1;
        if (isNeg) s.neg += 1;
      }
    }
  }

  const ranked = Array.from(stats.values())
    .filter((s) => s.hit > 0)
    .sort((a, b) => b.hit - a.hit);

  if (ranked.length === 0) {
    return ["- 全体的な評価の傾向はレビュー本文を確認してください"].join("\n");
  }

  const bullets: string[] = [];
  for (const s of ranked.slice(0, 5)) {
    let tone = "言及が多い";
    if (s.pos > s.neg && s.pos >= 2) tone = "好意的な声が多い";
    if (s.neg > s.pos && s.neg >= 2) tone = "不満の声もある";
    bullets.push(`- ${s.label}: ${tone}`);
  }

  return bullets.slice(0, 6).join("\n");
}

async function main() {
  if (!API_KEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");

  const logger = createRunLogger();
  console.log("log file:", logger.file);

  // ここは「負荷とクレジット」を見て調整
  const TAKE = Number(process.env.SYNC_DETAILS_TAKE ?? "1000");
  const SLEEP_MS = Number(process.env.SYNC_DETAILS_SLEEP_MS ?? "120");

  // 対象は最新に見えたものから（isHidden=false を優先）
  const targets = await prisma.place.findMany({
    where: { isHidden: false },
    orderBy: { lastSeenAt: "desc" },
    take: TAKE,
    select: { placeId: true },
  });

  const now = new Date();
  let ok = 0;
  let ng = 0;
  let skipped = 0;
  let invalid = 0;
  let warnTentative = 0;

  // max clients に当たりやすいので、直列実行＋sleepで圧を下げる
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const placeId = t.placeId;

    try {
      const d = await fetchDetails(placeId);
      if (!d) {
        invalid++;
        logger.write({
          level: "WARN",
          event: "SKIP_INVALID_PLACE_ID",
          ts: now.toISOString(),
          idx: i + 1,
          total: targets.length,
          placeId,
        });
        await sleep(SLEEP_MS);
        continue;
      }

      const name = d.displayName?.text ?? null;
      const addr = d.formattedAddress ?? null;
      const area = extractArea(addr);

      const c = udonClassifier.classify({
        placeId,
        name,
        types: d.types ?? [],
        address: addr,
      });

      // ログ: matchedInclude / matchedExclude / reasons
      const baseLog = {
        ts: now.toISOString(),
        idx: i + 1,
        total: targets.length,
        placeId,
        name,
        address: addr,
        area,
        types: d.types ?? [],
        rating: d.rating ?? null,
        userRatingCount: d.userRatingCount ?? null,
        classify: {
          isUdon: c.isUdon,
          reasons: c.reasons ?? [],
          matchedInclude: c.matchedInclude ?? [],
          matchedExclude: c.matchedExclude ?? [],
        },
      };

      if (!c.isUdon) {
        skipped++;

        console.log("skip(non-udon):", placeId, name ?? "(no name)", c.reasons.join(", "));
        logger.write({ level: "INFO", event: "SKIP_NON_UDON", ...baseLog });

        // DBから隠す + cache削除
        await prisma.place
          .update({ where: { placeId }, data: { isHidden: true } })
          .catch(() => {});
        await prisma.placeCache.deleteMany({ where: { placeId } }).catch(() => {});

        await sleep(SLEEP_MS);
        continue;
      }

      const matchedInclude = c.matchedInclude;
      const hasInclude = Array.isArray(matchedInclude) && matchedInclude.length > 0;

      if (!hasInclude) {
        warnTentative++;
        logger.write({ level: "WARN", event: "TENTATIVE_ALLOW_NO_INCLUDE", ...baseLog });
      } else {
        logger.write({ level: "INFO", event: "ALLOW_UDON", ...baseLog });
      }

      // reviews -> 箇条書き要約（無料版）
      const reviewTexts =
        USE_REVIEWS
          ? ((d.reviews?.map((r) => r.text?.text).filter(Boolean) as string[]) ?? [])
          : [];

      const reviewSummary =
        reviewTexts.length > 0 ? summarizeReviewsJaFree(reviewTexts) : null;

      const openingHours = d.regularOpeningHours
          ? {
              periods: d.regularOpeningHours.periods ?? [],
              weekdayDescriptions: d.regularOpeningHours.weekdayDescriptions ?? [],
            }
          : undefined;
      const openDays = computeOpenDays(d.regularOpeningHours);

      // isHidden を戻す（既にfalseでもOK）
      await prisma.place
        .update({ where: { placeId }, data: { isHidden: false } })
        .catch(() => {});

      // cache upsert（詳細反映）
      await prisma.placeCache.upsert({
        where: { placeId },
        create: {
          placeId,
          name: name ?? "(no name)",
          address: addr,
          area,
          lat: d.location?.latitude ?? null,
          lng: d.location?.longitude ?? null,
          types: d.types ?? [],
          rating: d.rating ?? null,
          userRatingCount: d.userRatingCount ?? null,
          googleMapsUri: d.googleMapsUri ?? null,
          openingHours,
          openDays,
          utcOffsetMinutes: d.utcOffsetMinutes ?? null,
          fetchedAt: now,
          reviewSummary,
        },
        update: {
          name: name ?? "(no name)",
          address: addr,
          area,
          lat: d.location?.latitude ?? null,
          lng: d.location?.longitude ?? null,
          types: d.types ?? [],
          rating: d.rating ?? null,
          userRatingCount: d.userRatingCount ?? null,
          googleMapsUri: d.googleMapsUri ?? null,
          openingHours,
          openDays,
          utcOffsetMinutes: d.utcOffsetMinutes ?? null,
          fetchedAt: now,
          reviewSummary,
        },
      });

      ok++;
      await sleep(SLEEP_MS);
    } catch (e) {
      ng++;
      console.error("failed:", placeId, e);

      logger.write({
        level: "ERROR",
        event: "FAILED",
        ts: new Date().toISOString(),
        placeId,
        error: String(e),
      });

      // 失敗しても止めない
      await sleep(Math.max(200, SLEEP_MS));
    }
  }

  const summary = {
    ok,
    ng,
    skipped,
    invalid,
    warnTentative,
    total: targets.length,
    logFile: logger.file,
    useReviews: USE_REVIEWS,
  };

  console.log(JSON.stringify(summary, null, 2));
  logger.write({ level: "INFO", event: "SUMMARY", ts: new Date().toISOString(), ...summary });
  await logger.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // DB切断時に落ちることがあるため握りつぶして終了
    try {
      await prisma.$disconnect();
    } catch {
      // noop
    }
  });
