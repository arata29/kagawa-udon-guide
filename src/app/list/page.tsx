import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import { cache } from "react";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import FavoriteButton from "@/components/FavoriteButton";
import OpenHoursFilter from "@/app/list/OpenHoursFilter";
import { siteUrl } from "@/lib/site";
import {
  getLocalDayMinutes,
  isOpenAt,
  isOpenNow,
  isClosedOnDay,
  isOpenOnDay,
  parseTimeInput,
} from "@/lib/openingHours";
import type { OpeningHours } from "@/lib/openingHours";
import { safeDbQuery } from "@/lib/db";

const listTitle = "【香川】讃岐うどん店一覧｜検索・絞り込み";
const listDescription =
  "香川の讃岐うどん人気・おすすめ店を一覧で検索。評価・レビュー件数・エリア・営業時間で絞り込みできます。";
const listPageSize = 30;
const getTotalCount = cache(async () => {
  const result = await safeDbQuery("list total count", () =>
    prisma.placeCache.count()
  );
  return result.ok ? result.data : 0;
});
const placeListSelect = {
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
  openDays: true,
  fetchedAt: true,
} as const;
type PlaceListItem = Prisma.PlaceCacheGetPayload<{
  select: typeof placeListSelect;
}>;

type RawSearchParams = {
  q?: string | string[];
  page?: string | string[];
  sort?: string | string[];
  minRating?: string | string[];
  minReviews?: string | string[];
  area?: string | string[];
  openNow?: string | string[];
  openAt?: string | string[];
  openDay?: string | string[];
};

type ParsedSearchParams = {
  q: string;
  page: number;
  sort: "rating" | "reviews";
  minRating: number;
  minReviews: number;
  area: string;
  openNow: boolean;
  openAt: string;
  openDay: string;
};

type HrefParams = {
  q?: string;
  page?: string;
  sort?: "rating" | "reviews";
  minRating?: string;
  minReviews?: string;
  area?: string;
  openNow?: string;
  openAt?: string;
  openDay?: string;
};

const asString = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const normalizeNumberInput = (value: string) =>
  value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xff10 + 48)
    )
    .replace(/[．，]/g, ".")
    .trim();

const parseNumberInput = (value: string) => {
  const normalized = normalizeNumberInput(value);
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseSearchParams = (sp: RawSearchParams = {}): ParsedSearchParams => {
  const q = asString(sp.q).trim();
  const page = Math.max(1, Number(asString(sp.page)) || 1);
  const sort = asString(sp.sort) === "rating" ? "rating" : "reviews";
  const minRating = Math.max(0, parseNumberInput(asString(sp.minRating)));
  const minReviews = Math.max(0, parseNumberInput(asString(sp.minReviews)));
  const area = asString(sp.area).trim();
  const openAtRaw = asString(sp.openAt).trim();
  const openDayRaw = asString(sp.openDay).trim();
  const openNow = asString(sp.openNow) === "1";
  const openAt = openNow ? "" : openAtRaw;
  const openDay = openNow ? "" : openDayRaw;
  return { q, page, sort, minRating, minReviews, area, openNow, openAt, openDay };
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const { q, page, sort, minRating, minReviews, area, openNow, openAt, openDay } =
    parseSearchParams(await searchParams);
  const hasFilters =
    Boolean(q) ||
    Boolean(area) ||
    minRating > 0 ||
    minReviews > 0 ||
    sort !== "reviews" ||
    openNow ||
    Boolean(openAt) ||
    Boolean(openDay);
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
  const { q, page, sort, minRating, minReviews, area, openNow, openAt, openDay } =
    parseSearchParams(await searchParams);
  const hasFilters =
    Boolean(q) ||
    Boolean(area) ||
    minRating > 0 ||
    minReviews > 0 ||
    sort !== "reviews" ||
    openNow ||
    Boolean(openAt) ||
    Boolean(openDay);

  const openAtValue = openAt.trim();
  const openDayValue = openDay.trim();
  const openAtMinutes = parseTimeInput(openAtValue);
  const openDayIndex =
    openDayValue === "" ? null : Number.parseInt(openDayValue, 10);
  const hasOpenDayFilter = openDayIndex != null && !Number.isNaN(openDayIndex);
  const needsOpenFilter = openNow || openAtMinutes != null;

  const take = listPageSize;
  const skip = (page - 1) * take;

  const ratingWhere =
    minRating > 0 || sort === "rating"
      ? {
          ...(minRating > 0 ? { gte: minRating } : {}),
          ...(sort === "rating" ? { not: null } : {}),
        }
      : undefined;

  const reviewsWhere =
    minReviews > 0 || sort === "reviews"
      ? {
          ...(minReviews > 0 ? { gte: minReviews } : {}),
          ...(sort === "reviews" ? { not: null } : {}),
        }
      : undefined;

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
    ...(ratingWhere ? { rating: ratingWhere } : {}),
    ...(reviewsWhere ? { userRatingCount: reviewsWhere } : {}),
    ...(hasOpenDayFilter ? { openDays: { has: openDayIndex } } : {}),
  };

  const orderBy =
    sort === "reviews"
      ? [{ userRatingCount: "desc" as const }, { fetchedAt: "desc" as const }]
      : [
          { rating: "desc" as const },
          { userRatingCount: "desc" as const },
          { fetchedAt: "desc" as const },
        ];

  let areaRows: Array<{ area: string | null }> = [];
  let basePlaces: PlaceListItem[] = [];
  let totalBase = 0;
  let dbUnavailable = false;

  const listResult = await safeDbQuery("list page", () =>
    Promise.all([
      prisma.placeCache.findMany({
        where: { area: { not: null } },
        distinct: ["area"],
        select: { area: true },
      }),
      needsOpenFilter
        ? prisma.placeCache.findMany({ where, orderBy, select: placeListSelect })
        : prisma.placeCache.findMany({
            where,
            orderBy,
            take,
            skip,
            select: placeListSelect,
          }),
      needsOpenFilter
        ? Promise.resolve(0)
        : hasFilters
          ? prisma.placeCache.count({ where })
          : getTotalCount(),
    ])
  );
  if (listResult.ok) {
    [areaRows, basePlaces, totalBase] = listResult.data;
  } else {
    dbUnavailable = true;
  }

  if (dbUnavailable) {
    return (
      <main className="app-shell page-in">
        <section className="app-hero">
          <div>
            <p className="app-kicker">Sanuki Udon Index</p>
            <h1 className="app-title">
              <UdonIcon className="app-title-icon" />
              讃岐うどん店一覧
            </h1>
            <p className="app-lead">
              データベースに接続できないため、一覧を表示できませんでした。
            </p>
            <div className="mt-4">
              <Link className="app-button app-button--ghost" href="/">
                トップへ戻る
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const filteredPlaces = needsOpenFilter
    ? basePlaces.filter((p) => {
        const openingHours = p.openingHours as OpeningHours | null;
        if (openNow) {
          const result = isOpenNow(openingHours, p.utcOffsetMinutes);
          return result === true;
        }
        if (openAtMinutes != null) {
          const day =
            openDayIndex != null && !Number.isNaN(openDayIndex)
              ? openDayIndex
              : getLocalDayMinutes(new Date(), p.utcOffsetMinutes).day;
          const result = isOpenAt(openingHours, day, openAtMinutes);
          return result === true;
        }
        if (openDayIndex != null && !Number.isNaN(openDayIndex)) {
          const result = isOpenOnDay(openingHours, openDayIndex);
          return result === true;
        }
        return true;
      })
    : basePlaces;

  const total = needsOpenFilter ? filteredPlaces.length : totalBase;
  const places = needsOpenFilter
    ? filteredPlaces.slice(skip, skip + take)
    : basePlaces;

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
      url: `${siteUrl}/shops/${encodeURIComponent(p.placeId)}`,
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
    const nopenNow = next.openNow ?? (openNow ? "1" : "");
    const nopenAt = next.openAt ?? openAt;
    const nopenDay = next.openDay ?? openDay;
    if (nq) params.set("q", nq);
    if (nsort) params.set("sort", nsort);
    if (nminRating) params.set("minRating", nminRating);
    if (nminReviews) params.set("minReviews", nminReviews);
    if (narea) params.set("area", narea);
    if (nopenNow) params.set("openNow", nopenNow);
    if (nopenAt) params.set("openAt", nopenAt);
    if (nopenDay) params.set("openDay", nopenDay);
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
      <Breadcrumb items={[
        { label: "ホーム", href: "/" },
        { label: "一覧" },
      ]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Sanuki Udon Index</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            讃岐うどん店一覧
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
        <div className="space-y-2 text-sm app-text">
          <h2 className="text-base font-semibold">一覧の使い方</h2>
          <p>
            店名・住所で検索し、評価やレビュー件数、エリアで絞り込めます。複数条件を組み合わせて比較するのがおすすめです。
          </p>
          <p>
            営業中のみや曜日・時刻で絞り込むと、いま行ける候補を探しやすくなります。
          </p>
          <p>
            気になる店は「Googleマップを開く」から位置や周辺環境も確認できます。
          </p>
          <p>
            営業時間は Google Maps の公開情報を参照しています。来店前に公式情報もご確認ください。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <form
          key={`${q}|${area}|${sort}|${minRating}|${minReviews}|${
            openNow ? 1 : 0
          }|${openAt}|${openDay}`}
          className="filter-form grid gap-3"
          action="/list"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="店名/住所で検索（例: 高松, うどん）"
          />

          <div className="grid gap-2">
            <div className="text-xs app-muted whitespace-normal">並び替え・エリア</div>
            <div className="grid grid-cols-1 gap-2">
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
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs app-muted whitespace-normal">評価・レビュー</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          </div>

          <div className="grid gap-2">
            <div className="text-xs app-muted whitespace-normal">営業時間</div>
            <OpenHoursFilter
              openDay={openDay}
              openAt={openAt}
              openNow={openNow}
            />
            <p className="text-xs app-muted">
              営業時間はGoogleマップの情報のため、誤りがある場合があります。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="page" value="1" />
            <button type="submit" className="app-button">
              検索
            </button>
            {(q ||
              area ||
              minRating > 0 ||
              minReviews > 0 ||
              openNow ||
              openAt ||
              openDay) && (
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
        const isOpen = isOpenNow(
          p.openingHours as OpeningHours | null,
          p.utcOffsetMinutes
        );
        const todayIndex = getLocalDayMinutes(
          new Date(),
          p.utcOffsetMinutes
        ).day;
        const openDays = Array.isArray(p.openDays) ? p.openDays : null;
        const closedToday =
          openDays != null && openDays.length > 0
            ? !openDays.includes(todayIndex)
            : isClosedOnDay(p.openingHours as OpeningHours | null, todayIndex);

        return (
          <li key={p.placeId} className="app-card">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/shops/${encodeURIComponent(p.placeId)}`}
                  className="font-semibold break-words underline"
                >
                  {p.name}
                </Link>

                    {p.address && (
                      <div className="mt-1 text-sm app-muted break-words">
                        {p.address}
                      </div>
                    )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.rating != null && (
                    <span className="app-badge app-badge--accent">
                      ★{p.rating.toFixed(1)}
                    </span>
                  )}
                  {p.userRatingCount != null && (
                    <span className="app-badge app-badge--soft">
                      {p.userRatingCount}件
                    </span>
                  )}
                  {isOpen === true && (
                    <span className="app-badge app-badge--accent">
                      営業中
                    </span>
                  )}
                  {closedToday === true && (
                    <span className="app-badge">定休日</span>
                  )}
                </div>
              </div>

                  <div className="flex gap-2 sm:flex-col sm:items-end">
                    <FavoriteButton placeId={p.placeId} name={p.name} />
                    <Link
                      href={`/shops/${encodeURIComponent(p.placeId)}`}
                      className="app-button"
                    >
                      詳細
                    </Link>
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
