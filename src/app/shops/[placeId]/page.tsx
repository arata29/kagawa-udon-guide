import Link from "next/link";
import { prisma } from "@/lib/prisma";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import type { OpeningHours } from "@/lib/openingHours";

export async function generateMetadata(props: {
  params: Promise<{ placeId?: string }>;
}): Promise<Metadata> {
  const { placeId } = await props.params;
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
  const infoParts: string[] = [];
  if (place.rating != null) infoParts.push(`★${place.rating}`);
  if (place.userRatingCount != null) infoParts.push(`${place.userRatingCount}件のレビュー`);
  if (place.area) infoParts.push(place.area);
  const infoStr = infoParts.length > 0 ? `（${infoParts.join(" / ")}）` : "";
  const description = place.address
    ? `${place.address}にある${place.name}の店舗情報${infoStr}。営業時間・地図を確認できます。`
    : `${place.name}の店舗情報${infoStr}。営業時間・地図を確認できます。`;
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

  const placeOpeningHours = place.openingHours as OpeningHours | null;
  const openingHoursSpecification = (() => {
    const periods = placeOpeningHours?.periods;
    if (!periods || periods.length === 0) return undefined;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const specs = periods
      .filter((p) => p.open?.day != null && p.close?.day != null)
      .map((p) => ({
        "@type": "OpeningHoursSpecification" as const,
        dayOfWeek: `https://schema.org/${dayNames[p.open!.day!]}`,
        opens: `${String(p.open!.hour ?? 0).padStart(2, "0")}:${String(p.open!.minute ?? 0).padStart(2, "0")}`,
        closes: `${String(p.close!.hour ?? 0).padStart(2, "0")}:${String(p.close!.minute ?? 0).padStart(2, "0")}`,
      }));
    return specs.length > 0 ? specs : undefined;
  })();

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
    openingHoursSpecification,
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
      {
        "@type": "ListItem",
        position: 3,
        name: place.name,
        item: `${siteUrl}/shops/${encodeURIComponent(place.placeId)}`,
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
      <Breadcrumb items={[
        { label: "ホーム", href: "/" },
        { label: "一覧", href: "/list" },
        { label: place.name },
      ]} />
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
            {place.area && (
              <Link
                href={`/rankings/area/${encodeURIComponent(place.area)}`}
                className="app-badge"
              >
                {place.area}
              </Link>
            )}
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

      {(() => {
        const descriptions = placeOpeningHours?.weekdayDescriptions;
        if (!descriptions || descriptions.length === 0) return null;
        return (
          <div className="mt-6 app-card">
            <h2 className="text-sm font-semibold mb-3">営業時間</h2>
            <ul className="text-sm space-y-1 app-text">
              {descriptions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs app-muted">
              ※ Google Maps の情報を参照しています。来店前に最新情報をご確認ください。
            </p>
          </div>
        );
      })()}

    </main>
  );
}
