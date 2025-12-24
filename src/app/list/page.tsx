import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { cache } from "react";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

const listTitle =
  "【香川】讃岐うどん屋一覧 | GoogleMapから店情報を自動取得 | 人気・おすすめ店";
const listDescription =
  "香川の讃岐うどん人気・おすすめ店を一覧で検索。GoogleMapの評価とレビュー件数、エリアで絞り込みできます。";
const listPageSize = 30;
const getTotalCount = cache(async () => prisma.placeCache.count());

type RawSearchParams = {
  q?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  minRating?: string | string[];
  minReviews?: string | string[];
  area?: string | string[];
};

type ParsedSearchParams = {
  q: string;
  page: number;
  sort: "rating" | "reviews";
  minRating: number;
  minReviews: number;
  area: string;
};

type HrefParams = {
  q?: string;
  page?: string;
  sort?: "rating" | "reviews";
  minRating?: string;
  minReviews?: string;
  area?: string;
};

const asString = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const parseSearchParams = (sp: RawSearchParams = {}): ParsedSearchParams => {
  const q = asString(sp.q).trim();
  const page = Math.max(1, Number(asString(sp.page)) || 1);
  const sort = asString(sp.sort) === "rating" ? "rating" : "reviews";
  const minRating = Math.max(0, Number(asString(sp.minRating)) || 0);
  const minReviews = Math.max(0, Number(asString(sp.minReviews)) || 0);
  const area = asString(sp.area).trim();
  return { q, page, sort, minRating, minReviews, area };
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const { q, page, sort, minRating, minReviews, area } =
    parseSearchParams(await searchParams);
  const hasFilters =
    Boolean(q) ||
    Boolean(area) ||
    minRating > 0 ||
    minReviews > 0 ||
    sort !== "reviews";
  const canonical = hasFilters
    ? "/list"
    : page > 1
      ? `/list?page=${page}`
      : "/list";
  let pagination: Metadata["pagination"] | undefined;
  if (!hasFilters) {
    const total = await getTotalCount();
    const totalPages = Math.max(1, Math.ceil(total / listPageSize));
    pagination = {
      previous: page > 1 ? `${siteUrl}/list?page=${page - 1}` : null,
      next: page < totalPages ? `${siteUrl}/list?page=${page + 1}` : null,
    };
  }

  return {
    title: listTitle,
    description: listDescription,
    alternates: { canonical },
    ...(pagination ? { pagination } : {}),
    ...(hasFilters ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const { q, page, sort, minRating, minReviews, area } = parseSearchParams(
    await searchParams
  );
  const hasFilters =
    Boolean(q) ||
    Boolean(area) ||
    minRating > 0 ||
    minReviews > 0 ||
    sort !== "reviews";

  const take = listPageSize;
  const skip = (page - 1) * take;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { address: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(area ? { area } : {}),
    ...(minRating > 0 ? { rating: { gte: minRating } } : {}),
    ...(minReviews > 0 ? { userRatingCount: { gte: minReviews } } : {}),
    ...(sort === "rating" ? { rating: { not: null } } : {}),
    ...(sort === "reviews" ? { userRatingCount: { not: null } } : {}),
  };

  const orderBy =
    sort === "reviews"
      ? [{ userRatingCount: "desc" as const }, { fetchedAt: "desc" as const }]
      : [
          { rating: "desc" as const },
          { userRatingCount: "desc" as const },
          { fetchedAt: "desc" as const },
        ];

  const totalPromise = hasFilters
    ? prisma.placeCache.count({ where })
    : getTotalCount();
  const [total, places, areaRows] = await Promise.all([
    totalPromise,
    prisma.placeCache.findMany({ where, orderBy, take, skip }),
    prisma.placeCache.findMany({
      where: { area: { not: null } },
      distinct: ["area"],
      select: { area: true },
    }),
  ]);

  const areas = areaRows
    .map((a) => (a.area ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));

  const totalPages = Math.max(1, Math.ceil(total / take));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listTitle,
    itemListElement: places.slice(0, take).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: p.name,
      url:
        p.googleMapsUri ??
        (p.lat != null && p.lng != null
          ? `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16`
          : `https://www.google.com/maps?q=${encodeURIComponent(
              `${p.name} ${p.address ?? ""}`
            )}&z=16`),
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "一覧",
        item: `${siteUrl}/list`,
      },
    ],
  };

  const mkHref = (next: Partial<HrefParams>) => {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const np = next.page ?? String(page);
    const nsort = next.sort ?? sort;
    const nminRating =
      next.minRating ?? (minRating > 0 ? String(minRating) : "");
    const nminReviews =
      next.minReviews ?? (minReviews > 0 ? String(minReviews) : "");
    const narea = next.area ?? area;
    if (nq) params.set("q", nq);
    if (nsort) params.set("sort", nsort);
    if (nminRating) params.set("minRating", nminRating);
    if (nminReviews) params.set("minReviews", nminReviews);
    if (narea) params.set("area", narea);
    params.set("page", np);
    return `/list?${params.toString()}`;
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
          <p className="app-kicker">Sanuki Udon Index</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            香川 讃岐うどん屋一覧
          </h1>
          <p className="app-lead">
            香川の讃岐うどん人気・おすすめ店を一覧で探せます。検索と評価で比較できます。
          </p>
        </div>
        <div className="app-hero-meta">
          <div className="app-stat">
            <span className="app-stat-value">{total}</span>
            <span className="app-stat-label">店舗</span>
          </div>
          <div className="app-stat">
            <span className="app-stat-value">
              {page}/{totalPages}
            </span>
            <span className="app-stat-label">ページ</span>
          </div>
        </div>
      </section>

      <section className="app-card mt-6">
        <form className="filter-form grid gap-3" action="/list" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="店名/住所で検索（例: 高松, うどん）"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select name="sort" defaultValue={sort}>
              <option value="reviews">レビュー件数順</option>
              <option value="rating">評価順</option>
            </select>

            <select name="area" defaultValue={area}>
              <option value="">エリア（全て）</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <input
              name="minRating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              defaultValue={minRating > 0 ? minRating : undefined}
              placeholder="最低評価（例: 4.0）"
            />

            <input
              name="minReviews"
              type="number"
              min="0"
              defaultValue={minReviews > 0 ? minReviews : undefined}
              placeholder="最低レビュー数（例: 50）"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="page" value="1" />
            <button type="submit" className="app-button">
              検索
            </button>
            {(q || area || minRating > 0 || minReviews > 0) && (
              <Link href="/list?page=1" className="app-button app-button--ghost">
                リセット
              </Link>
            )}
          </div>
        </form>

        <div className="mt-3 text-xs app-muted">
          {total}件 {page}/{totalPages}ページ
        </div>
      </section>

      {places.length === 0 ? (
        <div className="app-card mt-6">
          <p className="app-muted">該当するお店がありません。</p>
        </div>
      ) : (
        <ul className="mt-6 list-none p-0 space-y-4">
          {places.map((p) => {
            const openMapsUrl =
              p.googleMapsUri ??
              (p.lat != null && p.lng != null
                ? `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16`
                : `https://www.google.com/maps?q=${encodeURIComponent(
                    `${p.name} ${p.address ?? ""}`
                  )}&z=16`);

            return (
              <li key={p.placeId} className="app-card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold break-words">{p.name}</div>

                    {p.address && (
                      <div className="mt-1 text-sm app-muted break-words">
                        {p.address}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.rating != null && (
                        <span className="app-badge app-badge--accent">
                          ★{p.rating}
                        </span>
                      )}
                      {p.userRatingCount != null && (
                        <span className="app-badge app-badge--soft">
                          {p.userRatingCount}件
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 sm:flex-col sm:items-end">
                    <a
                      href={openMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="app-button app-button--ghost"
                    >
                      Googleマップを開く
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <nav className="mt-8 flex flex-wrap gap-2 justify-between text-sm">
        <Link
          className={`app-button app-button--ghost ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
          href={mkHref({ page: String(page - 1) })}
        >
          ← 前へ
        </Link>

        <span className="app-muted">
          {page}/{totalPages}
        </span>

        <Link
          className={`app-button app-button--ghost ${
            page >= totalPages ? "pointer-events-none opacity-50" : ""
          }`}
          href={mkHref({ page: String(page + 1) })}
        >
          次へ →
        </Link>
      </nav>
    </main>
  );
}
