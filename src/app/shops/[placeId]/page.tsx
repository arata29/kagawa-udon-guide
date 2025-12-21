import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UdonIcon from "@/components/UdonIcon";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(props: {
  params: { placeId?: string };
}): Promise<Metadata> {
  const placeId = props.params.placeId;
  if (!placeId) {
    return {
      title: "店舗が見つかりません",
      description: "指定された店舗が見つかりませんでした。",
    };
  }

  const place = await prisma.placeCache.findUnique({
    where: { placeId },
  });

  if (!place) {
    return {
      title: "店舗が見つかりません",
      description: "指定された店舗が見つかりませんでした。",
    };
  }

  const title = `${place.name} | 香川県うどんランキング`;
  const description = place.address
    ? `${place.address}にある${place.name}の店舗情報。`
    : `${place.name}の店舗情報。`;
  const url = `${siteUrl}/shops/${encodeURIComponent(place.placeId)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
    },
  };
}

export default async function ShopDetail(props: {
  params: Promise<{ placeId?: string }>;
}) {
  const { placeId } = await props.params;

  if (!placeId) {
    return (
      <main className="app-shell page-in">
        <section className="app-hero">
          <div>
            <p className="app-kicker">Shop Detail</p>
            <h1 className="app-title">
              <UdonIcon className="app-title-icon" />
              不正なURLです
            </h1>
            <p className="app-lead">placeId がありません。</p>
            <div className="mt-4">
              <Link className="app-button app-button--ghost" href="/list">
                一覧へ戻る
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const place = await prisma.placeCache.findUnique({
    where: { placeId },
  });

  if (!place) {
    return (
      <main className="app-shell page-in">
        <section className="app-hero">
          <div>
            <p className="app-kicker">Shop Detail</p>
            <h1 className="app-title">
              <UdonIcon className="app-title-icon" />
              見つかりませんでした
            </h1>
            <p className="app-lead">place_id: {placeId}</p>
            <div className="mt-4">
              <Link className="app-button app-button--ghost" href="/list">
                一覧へ戻る
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const hasLatLng = place.lat != null && place.lng != null;
  const mapEmbedUrl = hasLatLng
    ? `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(
        `${place.name} ${place.address ?? ""}`
      )}&z=16&output=embed`;

  const openMapsUrl =
    place.googleMapsUri ??
    (hasLatLng
      ? `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16`
      : `https://www.google.com/maps?q=${encodeURIComponent(
          `${place.name} ${place.address ?? ""}`
        )}&z=16`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: place.name,
    url: `${siteUrl}/shops/${encodeURIComponent(place.placeId)}`,
    address: place.address
      ? {
          "@type": "PostalAddress",
          streetAddress: place.address,
          addressRegion: "香川県",
          addressCountry: "JP",
        }
      : undefined,
    geo:
      place.lat != null && place.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: place.lat,
            longitude: place.lng,
          }
        : undefined,
    aggregateRating:
      place.rating != null && place.userRatingCount != null
        ? {
            "@type": "AggregateRating",
            ratingValue: place.rating,
            ratingCount: place.userRatingCount,
          }
        : undefined,
    sameAs: place.googleMapsUri ?? undefined,
  };

  return (
    <main className="app-shell page-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Shop Detail</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            {place.name}
          </h1>

          {place.address && <p className="app-lead">{place.address}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {place.rating != null && (
              <span className="app-badge app-badge--accent">
                ★ {place.rating}
              </span>
            )}
            {place.userRatingCount != null && (
              <span className="app-badge app-badge--soft">
                {place.userRatingCount}件
              </span>
            )}
            {place.types?.length ? (
              <span className="app-badge">{place.types.slice(0, 5).join(", ")}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={openMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="app-button"
          >
            Googleマップへ
          </a>
          <Link href="/list" className="app-button app-button--ghost">
            一覧に戻る
          </Link>
        </div>
      </section>

      <div className="mt-6 app-card">
        <iframe
          title="map"
          src={mapEmbedUrl}
          className="w-full h-[360px] rounded-2xl border"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/*
      <section className="mt-8">
        <h2 className="text-lg font-semibold">レビュー要約</h2>
        {reviewBullets.length ? (
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
            {reviewBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            まだ要約データがありません。sync:details 実行後に表示されます。
          </p>
        )}
      </section>
      */}

      <div className="mt-8 text-xs app-muted">place_id: {place.placeId}</div>
    </main>
  );
}
