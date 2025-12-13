import Link from "next/link";
import { prisma } from "@/lib/prisma";

/**
 * 自動ランキングのハブページ
 * - 総合ランキング（/rankings/auto）
 * - 市町村別ランキング（/rankings/area/[area]）
 *
 * 前提：
 * - PlaceCache に rating / userRatingCount が入っている（sync:details 実行済み）
 * - PlaceCache.area が埋まっている（同期時に抽出して保存している想定）
 */
export default async function RankingsHub() {
  // rating/件数/area があるデータだけを対象（ランキングとして意味がある）
  const rows = await prisma.placeCache.findMany({
    where: {
      rating: { not: null },
      userRatingCount: { not: null },
      area: { not: null }, // ★ area が取れてるものだけ
    },
    select: { area: true },
  });

  // area -> 件数 の集計
  const map = new Map<string, number>();
  for (const r of rows) {
    const a = (r.area ?? "").trim() || "不明";
    map.set(a, (map.get(a) ?? 0) + 1);
  }

  // 件数が多い順に並べる（上位ほどデータが多く、ランキングが見やすい）
  const areas = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));

  return (
    <main className="p-6 max-w-3xl mx-auto">
      {/* ページタイトル */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">自動ランキング</h1>
          <p className="mt-2 text-sm app-muted">
            Google評価（★）とレビュー件数から自動作成したランキングです。
          </p>
        </div>

        <Link className="text-sm underline" href="/">
          一覧へ
        </Link>
      </header>

      <div className="mt-6 space-y-4">
        {/* 総合ランキング */}
        <section className="app-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">総合ランキング</div>
              <div className="mt-1 text-sm app-muted">
                香川県内（評価データがある店）
              </div>
            </div>

            <Link className="text-sm underline whitespace-nowrap" href="/rankings/auto">
              見る →
            </Link>
          </div>
        </section>

        {/* 市町村別ランキング */}
        <section className="app-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">市町村別ランキング</div>
              <div className="mt-1 text-sm app-muted">
                DBに保存してある area（市/町/村）で自動分類しています
              </div>
            </div>
            <div className="text-xs app-muted whitespace-nowrap">
              {areas.length}カテゴリ
            </div>
          </div>

          {areas.length === 0 ? (
            <p className="mt-4 text-sm app-muted">
              対象データがありません。（sync:details 実行後、area が入ると表示されます）
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {areas.map((a) => (
                <li
                  key={a.area}
                  className="rounded-xl border px-3 py-2 transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Link
                    className="underline"
                    href={`/rankings/area/${encodeURIComponent(a.area)}`}
                  >
                    {a.area}
                  </Link>{" "}
                  <span className="app-muted">({a.count})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 注意書き */}
        <section className="text-xs app-muted">
          <p>
            ※評価/件数は Google Places のデータに基づきます。最新化は sync:details の実行タイミングに依存します。
          </p>
        </section>
      </div>
    </main>
  );
}
