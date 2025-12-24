import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MapClient from "./MapClient";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "【香川】讃岐うどん マップ | GoogleMapから店情報を自動取得 | 人気・おすすめ店",
  description:
    "香川の讃岐うどん人気・おすすめ店をGoogleMapで表示。GoogleMapの評価とレビュー件数を見ながら比較できます。",
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
    },
    orderBy: { fetchedAt: "desc" },
  });
  const places = rawPlaces.filter(
    (place): place is typeof rawPlaces[number] & { lat: number; lng: number } =>
      place.lat != null && place.lng != null
  );
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
      <section className="app-hero">
        <div>
          <p className="app-kicker">Udon Map</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            香川 讃岐うどん マップ
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

      <section className="mt-6">
        <MapClient places={places} />
      </section>
    </main>
  );
}
