import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";

export const metadata: Metadata = {
  title: "香川県うどん店一覧",
  description:
    "香川県内のうどん店を一覧で紹介。エリア・評価・レビュー件数で絞り込みできます。",
};

type SP = {
  q?: string;
  page?: string;
  sort?: "rating" | "reviews";
  minRating?: string;
  minReviews?: string;
  area?: string;
};

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const sort = sp.sort ?? "reviews";
  const minRating = Math.max(0, Number(sp.minRating ?? "0") || 0);
  const minReviews = Math.max(0, Number(sp.minReviews ?? "0") || 0);
  const area = (sp.area ?? "").trim();

  const take = 30;
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

  const [total, places, areaRows] = await Promise.all([
    prisma.placeCache.count({ where }),
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
    name: "香川県うどん店一覧",
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

  const mkHref = (next: Partial<SP>) => {
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
      <section className="app-hero">
        <div>
          <p className="app-kicker">Sanuki Udon Index</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            香川県うどん店一覧
          </h1>
          <p className="app-lead">
            店名や住所で検索し、評価やレビュー件数で絞り込みできます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="app-button app-button--ghost" href="/rankings">
              ランキングを見る
            </Link>
            <Link className="app-button app-button--ghost" href="/map">
              地図で探す
            </Link>
          </div>
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
