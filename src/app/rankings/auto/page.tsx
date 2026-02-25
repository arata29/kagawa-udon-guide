import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { bayesScore } from "@/lib/ranking";
import UdonIcon from "@/components/UdonIcon";
import FavoriteButton from "@/components/FavoriteButton";
import { siteUrl } from "@/lib/site";
import { isOpenNow } from "@/lib/openingHours";
import type { OpeningHours } from "@/lib/openingHours";
import { safeDbQuery } from "@/lib/db";

export const metadata: Metadata = {
  title: "【香川】讃岐うどん総合ランキング｜評価×レビュー",
  description:
    "香川の讃岐うどん人気・おすすめ店をGoogleMapの評価とレビュー件数で総合ランキング。比較に便利です。",
  alternates: {
    canonical: "/",
  },
};

type RankingScoreRow = {
  placeId: string;
  rating: number | null;
  userRatingCount: number | null;
};

type RankingDetailRow = {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  openingHours: unknown;
  utcOffsetMinutes: number | null;
};

function RankingDbError() {
  return (
    <main className="app-shell page-in">
      <section className="app-hero">
        <div>
          <p className="app-kicker">Sanuki Udon Ranking</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            讃岐うどん総合ランキング
          </h1>
          <p className="app-lead">
            データベースに接続できないため、ランキングを表示できませんでした。
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

export default async function AutoRanking({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pageBase = "/";
  const showSiteIntro = true;
  const pageHref = (p: number) => `${pageBase}?page=${p}`;
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
  const where = {
    rating: { not: null },
    userRatingCount: { not: null },
    OR: [
      { address: { contains: "香川県" } },
      { address: { contains: "Kagawa" } },
      { area: { not: null } },
    ],
  };

  let scoreRows: RankingScoreRow[] = [];
  const scoresResult = await safeDbQuery("auto ranking scores", () =>
    prisma.placeCache.findMany({
      where,
      select: {
        placeId: true,
        rating: true,
        userRatingCount: true,
      },
    })
  );
  if (scoresResult.ok) {
    scoreRows = scoresResult.data;
  } else {
    return <RankingDbError />;
  }

  if (scoreRows.length === 0) {
    return (
      <main className="app-shell page-in">
        <section className="app-hero">
          <div>
            <p className="app-kicker">Sanuki Udon Ranking</p>
            <h1 className="app-title">
              <UdonIcon className="app-title-icon" />
              讃岐うどん総合ランキング
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

  const C = scoreRows.reduce((s, r) => s + (r.rating ?? 0), 0) / scoreRows.length;
  const m = 50;
  const rankedScores = scoreRows
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
  const totalPages = Math.max(1, Math.ceil(rankedScores.length / perPage));
  const currentPage = Math.min(totalPages, page);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, rankedScores.length);
  const pagedScores = rankedScores.slice(startIndex, endIndex);
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const pageList = buildPageList(currentPage, totalPages);

  const pageIds = pagedScores.map((r) => r.placeId);
  const topOpenNowCandidateIds = rankedScores.slice(0, 150).map((r) => r.placeId);

  let detailRows: RankingDetailRow[] = [];
  let openNowCandidates: Array<{
    placeId: string;
    name: string;
    rating: number | null;
    openingHours: unknown;
    utcOffsetMinutes: number | null;
  }> = [];
  let lastSynced: Date | null = null;

  const detailsResult = await safeDbQuery("auto ranking details", () =>
    Promise.all([
      prisma.placeCache.findMany({
        where: { placeId: { in: pageIds } },
        select: {
          placeId: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          rating: true,
          userRatingCount: true,
          googleMapsUri: true,
          openingHours: true,
          utcOffsetMinutes: true,
        },
      }),
      prisma.placeCache.aggregate({
        _max: { fetchedAt: true },
      }),
      prisma.placeCache.findMany({
        where: { placeId: { in: topOpenNowCandidateIds } },
        select: {
          placeId: true,
          name: true,
          rating: true,
          openingHours: true,
          utcOffsetMinutes: true,
        },
      }),
    ])
  );
  if (!detailsResult.ok) {
    return <RankingDbError />;
  }
  const [details, { _max }, openNowRows] = detailsResult.data;
  detailRows = details;
  openNowCandidates = openNowRows;
  lastSynced = _max.fetchedAt;

  const detailMap = new Map(detailRows.map((r) => [r.placeId, r]));
  const paged = pagedScores
    .map((score) => {
      const detail = detailMap.get(score.placeId);
      if (!detail) return null;
      return { ...detail, score: score.score };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const openNowMap = new Map(openNowCandidates.map((r) => [r.placeId, r]));
  const openNowTop = topOpenNowCandidateIds
    .map((id) => openNowMap.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .filter(
      (r) =>
        isOpenNow(r.openingHours as OpeningHours | null, r.utcOffsetMinutes) === true
    )
    .slice(0, 5);

  const lastSyncedLabel = lastSynced
    ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(lastSynced)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "香川 讃岐うどん総合ランキング",
    itemListElement: paged.map((r, idx) => ({
      "@type": "ListItem",
      position: startIndex + idx + 1,
      name: r.name,
      url: `${siteUrl}/shops/${encodeURIComponent(r.placeId)}`,
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
            讃岐うどん総合ランキング
          </h1>
          <p className="app-lead">
            香川の讃岐うどん人気・おすすめ店をGoogleMapの評価とレビュー件数で総合ランキング。
          </p>
        </div>
        <div className="app-hero-meta">
          <div className="app-stat">
            <span className="app-stat-value">{rankedScores.length}</span>
            <span className="app-stat-label">店舗</span>
          </div>
          <div className="app-stat">
            <span className="app-stat-value">{lastSyncedLabel ?? "未更新"}</span>
            <span className="app-stat-label">最終更新</span>
          </div>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-2 text-sm app-text">
          <h2 className="text-base font-semibold">このランキングについて</h2>
          <p>
            Google Maps の評価とレビュー件数をもとに、総合的に比較しやすい順位を作成しています。
          </p>
          <p>
            評価とレビュー件数のバランスを考慮するため、ベイズ平均を使ってスコア化しています。
          </p>
          <p>
            同じ評価でもレビュー件数が多い店は信頼性が高いと考え、順位に反映しています。
          </p>
          <p>
            位置情報は公式サイト等ではなく Google Maps の公開情報を参照するため、最新情報は来店前にご確認ください。
          </p>
          <p>更新は定期的に行い、最新に近いランキングを目指します。</p>
        </div>
      </section>

      {showSiteIntro && (
        <section className="app-card mt-6">
          <h2 className="text-sm font-semibold mb-3">このサイトでできること</h2>
          <ul className="space-y-2 text-sm app-text">
            <li>
              <Link className="underline" href="/">
                総合ランキング
              </Link>
              — 香川全域のうどん店をベイズ平均スコアで順位付け
            </li>
            <li>
              <Link className="underline" href="/rankings">
                エリア別ランキング
              </Link>
              — 高松・丸亀・坂出など地区ごとの人気店を比較
            </li>
            <li>
              <Link className="underline" href="/list">
                店舗一覧・検索
              </Link>
              — 評価・レビュー件数・営業時間・エリアで絞り込み
            </li>
            <li>
              <Link className="underline" href="/map">
                マップ
              </Link>
              — 香川県内のうどん店を地図上で一覧表示
            </li>
          </ul>
        </section>
      )}

      {showSiteIntro && (() => {
        if (openNowTop.length === 0) return null;
        return (
          <section className="app-card mt-6">
            <h2 className="text-sm font-semibold mb-3">今すぐ行ける！営業中の人気店</h2>
            <ul className="space-y-2">
              {openNowTop.map((r, i) => (
                <li key={r.placeId} className="flex items-center gap-3 text-sm">
                  <span className="app-badge app-badge--open shrink-0">#{i + 1}</span>
                  <Link
                    href={`/shops/${encodeURIComponent(r.placeId)}`}
                    className="underline break-words min-w-0"
                  >
                    {r.name}
                  </Link>
                  <span className="app-badge app-badge--accent shrink-0 ml-auto">
                    ★{r.rating?.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link href="/list?openNow=1&page=1" className="text-xs underline app-muted">
                営業中の全店舗を見る →
              </Link>
            </div>
          </section>
        );
      })()}

      <div className="mt-4 text-xs app-muted">
        表示: {startIndex + 1}-{endIndex} / {rankedScores.length}件（{perPage}
        件/ページ）
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
          const openNow = isOpenNow(
            r.openingHours as OpeningHours | null,
            r.utcOffsetMinutes
          );

          const rank = startIndex + idx + 1;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
          const isTop3 = rank <= 3;

          return (
            <li
              key={r.placeId}
              className={`app-card${isTop3 ? " app-card--top3" : ""}${
                rank === 1
                  ? " app-card--gold"
                  : rank === 2
                    ? " app-card--silver"
                    : rank === 3
                      ? " app-card--bronze"
                      : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`app-rank-badge${
                        rank === 1
                          ? " app-rank-badge--gold"
                          : rank === 2
                            ? " app-rank-badge--silver"
                            : rank === 3
                              ? " app-rank-badge--bronze"
                              : ""
                      }`}
                    >
                      {medal ?? `#${rank}`}
                    </span>
                    <Link
                      href={`/shops/${encodeURIComponent(r.placeId)}`}
                      className={`font-semibold break-words underline${isTop3 ? " text-base" : ""}`}
                    >
                      {r.name}
                    </Link>
                  </div>

                  {r.address && <div className="mt-2 text-sm app-muted break-words">{r.address}</div>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="app-badge app-badge--accent">★{r.rating?.toFixed(1)}</span>
                    <span className="app-badge app-badge--soft">{r.userRatingCount}件</span>
                    {openNow === true && <span className="app-badge app-badge--open">営業中</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <FavoriteButton placeId={r.placeId} name={r.name} />
                  <Link className="app-button" href={`/shops/${encodeURIComponent(r.placeId)}`}>
                    詳細
                  </Link>
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
          href={pageHref(prevPage)}
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
                  <Link className="app-button app-button--ghost" href={pageHref(p)}>
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
          href={pageHref(nextPage)}
        >
          次へ →
        </Link>
      </nav>

      <p className="mt-6 text-xs app-muted">※評価/件数は Google Places のデータに基づきます。</p>
    </main>
  );
}
