import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MapClient from "./MapClient";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import { siteUrl } from "@/lib/site";
import type { OpeningHours } from "@/lib/openingHours";

export const metadata: Metadata = {
  title: "【香川】讃岐うどんマップ｜地図で探す",
  description:
    "香川の讃岐うどん人気・おすすめ店を地図で表示。評価とレビュー件数を見ながら比較できます。",
};

export default async function MapPage() {
  const rawPlaces = await prisma.placeCache.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      placeId: true,
      name: true,
      address: true,
      area: true,
      lat: true,
      lng: true,
      rating: true,
      userRatingCount: true,
      googleMapsUri: true,
      openingHours: true,
      utcOffsetMinutes: true,
    },
    orderBy: { fetchedAt: "desc" },
  });
  const places = rawPlaces
    .filter(
      (place): place is typeof rawPlaces[number] & { lat: number; lng: number } =>
        place.lat != null && place.lng != null
    )
    .map((place) => ({
      ...place,
      openingHours: place.openingHours as OpeningHours | null,
    }));
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "マップ", item: `${siteUrl}/map` },
    ],
  };

  return (
    <main className="app-shell app-shell--wide page-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Breadcrumb items={[{ label: "ホーム", href: "/" }, { label: "マップ" }]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Udon Map</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            讃岐うどんマップ
          </h1>
          <p className="app-lead">
            香川の讃岐うどん人気・おすすめ店をGoogleMapで探せます。評価やレビュー件数も確認できます。
          </p>
        </div>
        <div className="app-hero-meta">
          <div className="app-stat">
            <span className="app-stat-value">{places.length}</span>
            <span className="app-stat-label">店舗</span>
          </div>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-2 text-sm app-text">
          <h2 className="text-base font-semibold">マップの見方</h2>
          <p>
            香川の讃岐うどん店を地図で確認できます。評価やレビュー件数を見ながら比較できるのが特徴です。
          </p>
          <p>
            位置関係を把握したいときや、近隣の候補をまとめて見たいときに便利です。
          </p>
          <p>
            店舗情報は Google Maps の公開情報を参照しています。最新情報は公式情報も合わせてご確認ください。
          </p>
        </div>
      </section>

      <section className="mt-6">
        <MapClient places={places} />
      </section>
    </main>
  );
}
