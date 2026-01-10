import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UdonIcon from "@/components/UdonIcon";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "【香川】讃岐うどんランキング一覧｜総合・エリア別",
  description:
    "香川の讃岐うどん人気・おすすめ店を総合・エリア別ランキングで比較。評価とレビュー件数を反映しています。",
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
    const a = (r.area ?? "").trim() || "その他";
    map.set(a, (map.get(a) ?? 0) + 1);
  }

  const areas = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area, count]) => ({ area, count }));
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "ランキング一覧",
        item: `${siteUrl}/rankings`,
      },
    ],
  };

  return (
    <main className="app-shell page-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Ranking Guide</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            讃岐うどんランキング一覧
          </h1>
          <p className="app-lead">
            香川の讃岐うどん人気・おすすめ店をランキングで探せます。
          </p>
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

      <section className="app-card mt-6">
        <div className="space-y-2 text-sm app-text">
          <div className="font-semibold">ランキングの見方</div>
          <p>
            総合ランキングは評価とレビュー件数をもとに比較しやすい順序で並べています。
          </p>
          <p>
            エリア別は地域ごとの人気傾向が分かるため、近場で探したいときに便利です。
          </p>
          <p>
            気になるエリアを先に開き、上位店舗から見ると効率よく比較できます。
          </p>
          <p>
            情報は Google Maps の公開情報を参照しているため、最新の営業状況は来店前にご確認ください。
          </p>
        </div>
      </section>

      <div className="mt-6 space-y-4">
        <section className="app-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="font-semibold">総合ランキング</div>
              <div className="mt-1 text-sm app-muted">
                香川の讃岐うどん人気・おすすめ店を総合ランキングで紹介しています。
              </div>
            </div>

            <Link className="app-button app-button--ghost" href="/">
              見る →
            </Link>
          </div>
        </section>

        <section className="app-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="font-semibold">エリア別ランキング</div>
              <div className="mt-1 text-sm app-muted">
                エリアごとの讃岐うどんランキングを比較できます。
              </div>
            </div>
            <div className="text-xs app-muted whitespace-nowrap">
              {areas.length}エリア
            </div>
          </div>

          {areas.length === 0 ? (
            <p className="mt-4 text-sm app-muted">
              対象データがありません。sync:details 実行後、area が入ると表示されます。
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
      </div>
    </main>
  );
}
