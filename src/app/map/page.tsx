import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MapClient from "./MapClient";
import UdonIcon from "@/components/UdonIcon";

export const metadata: Metadata = {
  title: "香川県うどんマップ",
  description: "香川県内のうどん店を地図とリストで探せます。",
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

  return (
    <main className="app-shell app-shell--wide page-in">
      <section className="app-hero">
        <div>
          <p className="app-kicker">Udon Map</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            香川県うどんマップ
          </h1>
          <p className="app-lead">
            地図とリストを連動させて、人気のうどん店をすばやく比較できます。
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
