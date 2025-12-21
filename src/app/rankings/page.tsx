import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UdonIcon from "@/components/UdonIcon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング案内",
  description:
    "香川県うどんランキングの案内ページ。総合ランキングとエリア別ランキングへ進めます。",
};

export default async function RankingsHub() {
  const rows = await prisma.placeCache.findMany({
    where: {
      rating: { not: null },
      userRatingCount: { not: null },
      area: { not: null },
    },
    select: { area: true },
  });
  const { _max } = await prisma.placeCache.aggregate({
    _max: { fetchedAt: true },
  });
  const lastSynced = _max.fetchedAt;
  const lastSyncedLabel = lastSynced
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(lastSynced)
    : null;

  const map = new Map<string, number>();
  for (const r of rows) {
    const a = (r.area ?? "").trim() || "不明";
    map.set(a, (map.get(a) ?? 0) + 1);
  }

  const areas = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));

  return (
    <main className="app-shell page-in">
      <section className="app-hero">
        <div>
          <p className="app-kicker">Ranking Guide</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            ランキング案内
          </h1>
          <p className="app-lead">
            Google評価とレビュー件数をもとに、香川県のうどん店を自動でランキング化しています。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="app-button app-button--ghost" href="/list">
              一覧へ
            </Link>
            <Link className="app-button app-button--ghost" href="/map">
              地図で探す
            </Link>
          </div>
        </div>
        <div className="app-hero-meta">
          <div className="app-stat">
            <span className="app-stat-value">{areas.length}</span>
            <span className="app-stat-label">エリア</span>
          </div>
          <div className="app-stat">
            <span className="app-stat-value">
              {lastSyncedLabel ?? "未更新"}
            </span>
            <span className="app-stat-label">最終更新</span>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        <section className="app-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">総合ランキング</div>
              <div className="mt-1 text-sm app-muted">
                香川県内の評価データがあるお店を総合順で表示
              </div>
            </div>

            <Link className="app-button app-button--ghost" href="/rankings/auto">
              見る →
            </Link>
          </div>
        </section>

        <section className="app-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">市町村別ランキング</div>
              <div className="mt-1 text-sm app-muted">
                DBに保存された area（市町村）で自動集計
              </div>
            </div>
            <div className="text-xs app-muted whitespace-nowrap">
              {areas.length}カテゴリ
            </div>
          </div>

          {areas.length === 0 ? (
            <p className="mt-4 text-sm app-muted">
              対象データがありません。sync:details 実行後に表示されます。
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {areas.map((a) => (
                <li key={a.area} className="app-card app-card--mini">
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

        <section className="text-xs app-muted">
          <p>※評価/件数は Google Places のデータに基づきます。</p>
        </section>
      </div>
    </main>
  );
}