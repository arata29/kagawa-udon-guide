import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { bayesScore } from "@/lib/ranking";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "【香川】讃岐うどん ランキング | GoogleMapから店情報を自動取得 | 人気・おすすめ店",
  description:
    "香川の讃岐うどん人気・おすすめ店をGoogleMapの評価とレビュー件数で自動ランキング。総合ランキングで比較できます。",
  alternates: {
    canonical: "/",
  },
};

export default async function AutoRanking({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const buildPageList = (current: number, total: number) => {
    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let i = current - 1; i <= current + 1; i++) {
      if (i >= 1 && i <= total) pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const rows = await prisma.placeCache.findMany({
    where: {
      rating: { not: null },
      userRatingCount: { not: null },
      OR: [{ address: { contains: "香川県" } }, { address: { contains: "Kagawa" } }],
    },
    select: {
      placeId: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      rating: true,
      userRatingCount: true,
      googleMapsUri: true,
    },
  });

  if (rows.length === 0) {
    return (
      <main className="app-shell page-in">
        <section className="app-hero">
          <div>
            <p className="app-kicker">Sanuki Udon Ranking</p>
            <h1 className="app-title">
              <UdonIcon className="app-title-icon" />
              香川 讃岐うどん 総合ランキング
            </h1>
            <p className="app-lead">
              まだ評価データがありません。sync:details を実行してください。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="app-button app-button--ghost" href="/rankings">
                ランキング一覧へ
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { _max } = await prisma.placeCache.aggregate({
    _max: { fetchedAt: true },
  });
  const lastSynced = _max.fetchedAt;
  const lastSyncedLabel = lastSynced
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(lastSynced)
    : null;

  const C = rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length;
  const m = 50;

  const ranked = rows
    .map((r) => {
      const R = r.rating ?? 0;
      const v = r.userRatingCount ?? 0;
      return { ...r, score: bayesScore(R, v, C, m) };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if ((b.userRatingCount ?? 0) !== (a.userRatingCount ?? 0)) {
        return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
      }
      if ((b.rating ?? 0) !== (a.rating ?? 0)) {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      return String(a.placeId).localeCompare(String(b.placeId));
    });

  const perPage = 50;
  const totalPages = Math.max(1, Math.ceil(ranked.length / perPage));
  const currentPage = Math.min(totalPages, page);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, ranked.length);
  const paged = ranked.slice(startIndex, endIndex);
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const pageList = buildPageList(currentPage, totalPages);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "香川 讃岐うどん 総合ランキング",
    itemListElement: paged.map((r, idx) => ({
      "@type": "ListItem",
      position: startIndex + idx + 1,
      name: r.name,
      url:
        r.googleMapsUri ??
        (r.lat != null && r.lng != null
          ? `https://www.google.com/maps?q=${r.lat},${r.lng}&z=16`
          : `https://www.google.com/maps?q=${encodeURIComponent(
              `${r.name} ${r.address ?? ""}`
            )}&z=16`),
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "ホーム",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "総合ランキング",
        item: siteUrl,
      },
    ],
  };

  return (
    <main className="app-shell page-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Sanuki Udon Ranking</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            香川 讃岐うどん 総合ランキング
          </h1>
          <p className="app-lead">
            香川の讃岐うどん人気・おすすめ店をGoogleMapの評価とレビュー件数で総合ランキング。
          </p>
        </div>
        <div className="app-hero-meta">
          <div className="app-stat">
            <span className="app-stat-value">{ranked.length}</span>
            <span className="app-stat-label">店舗</span>
          </div>
          <div className="app-stat">
            <span className="app-stat-value">{lastSyncedLabel ?? "未更新"}</span>
            <span className="app-stat-label">最終更新</span>
          </div>
        </div>
      </section>

      <div className="mt-4 text-xs app-muted">
        表示: {startIndex + 1}-{endIndex} / {ranked.length}件（{perPage}件/ページ）
      </div>

      <ol className="mt-4 space-y-4">
        {paged.map((r, idx) => {
          const openMapsUrl =
            r.googleMapsUri ??
            (r.lat != null && r.lng != null
              ? `https://www.google.com/maps?q=${r.lat},${r.lng}&z=16`
              : `https://www.google.com/maps?q=${encodeURIComponent(
                  `${r.name} ${r.address ?? ""}`
                )}&z=16`);

          return (
            <li key={r.placeId} className="app-card">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="app-badge app-badge--accent">
                      #{startIndex + idx + 1}
                    </span>
                    <div className="font-semibold break-words">{r.name}</div>
                  </div>

                  {r.address && (
                    <div className="mt-2 text-sm app-muted break-words">
                      {r.address}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="app-badge app-badge--accent">
                      ★{r.rating}
                    </span>
                    <span className="app-badge app-badge--soft">
                      {r.userRatingCount}件
                    </span>
                  </div>

                  <div className="mt-2 text-xs app-muted">
                    score: {r.score.toFixed(3)}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    className="app-button app-button--ghost"
                    href={openMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Googleマップへ
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <nav className="mt-8 flex flex-wrap gap-2 justify-between text-sm">
        <Link
          className={`app-button app-button--ghost ${
            currentPage <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
          href={`/rankings/auto?page=${prevPage}`}
        >
          ← 前へ
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {pageList.map((p, idx) => {
            const prev = pageList[idx - 1];
            const showEllipsis = prev != null && p - prev > 1;
            return (
              <span key={p} className="flex items-center gap-2">
                {showEllipsis && <span className="app-muted">…</span>}
                {p === currentPage ? (
                  <span className="app-badge app-badge--accent">{p}</span>
                ) : (
                  <Link
                    className="app-button app-button--ghost"
                    href={`/rankings/auto?page=${p}`}
                  >
                    {p}
                  </Link>
                )}
              </span>
            );
          })}
          <span className="app-muted">
            {currentPage}/{totalPages}
          </span>
        </div>

        <Link
          className={`app-button app-button--ghost ${
            currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
          href={`/rankings/auto?page=${nextPage}`}
        >
          次へ →
        </Link>
      </nav>

      <p className="mt-6 text-xs app-muted">
        ※評価/件数は Google Places のデータに基づきます。
      </p>
    </main>
  );
}
