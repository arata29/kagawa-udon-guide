import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type Place = {
  id: string; // place_id
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
};

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// 香川県中心のバイアス検索
const CENTERS = [
  { latitude: 34.3428, longitude: 134.0466 }, // 高松
  { latitude: 34.2840, longitude: 133.7850 }, // 丸亀
  { latitude: 34.3000, longitude: 134.3000 }, // さぬき/東かがわ
];

const RADIUS_M = 50000;

// テキスト検索クエリ
const QUERIES = [
  "香川県 うどん",
  "さぬきうどん 香川",
  "高松 うどん",
  "丸亀 うどん",
  "坂出 うどん",
  "観音寺 うどん",
  "三豊 うどん",
  "善通寺 うどん",
  "琴平 うどん",
  "東かがわ うどん",
  "三木町 うどん",
  "綾川町 うどん",
  "まんのう うどん",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function textSearchAll(
  textQuery: string,
  center: { latitude: number; longitude: number }
): Promise<Place[]> {
  const results: Place[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 4; i++) {
    const body: Record<string, unknown> = {
      textQuery,
      pageSize: 20,
      languageCode: "ja",
      regionCode: "JP",
      locationBias: {
        circle: { center, radius: RADIUS_M },
      },
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,nextPageToken",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { places?: Place[]; nextPageToken?: string };
    if (json.places?.length) results.push(...json.places);
    if (!json.nextPageToken) break;

    pageToken = json.nextPageToken;
    await sleep(400);
  }

  return results;
}

async function main() {
  if (!API_KEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");

  const now = new Date();
  let insertedOrUpdated = 0;

  // place_id で重複排除
  const map = new Map<string, Place>();

  for (const q of QUERIES) {
    for (const center of CENTERS) {
      const places = await textSearchAll(q, center);
      for (const p of places) {
        if (!p.id) continue;

        const addr = p.formattedAddress ?? "";
        const isKagawa =
          addr.includes("香川県") || addr.toLowerCase().includes("kagawa");

        if (!isKagawa) continue;

        map.set(p.id, p);
      }
      await sleep(250);
    }
  }

  // DBへ upsert
  for (const p of map.values()) {
    const placeId = p.id;
    const name = p.displayName?.text ?? "(no name)";
    const address = p.formattedAddress ?? null;
    const lat = p.location?.latitude ?? null;
    const lng = p.location?.longitude ?? null;
    const types = p.types ?? [];

    await prisma.place.upsert({
      where: { placeId },
      create: { placeId, firstSeenAt: now, lastSeenAt: now },
      update: { lastSeenAt: now, isHidden: false },
    });

    await prisma.placeCache.upsert({
      where: { placeId },
      create: { placeId, name, address, lat, lng, types, fetchedAt: now },
      update: { name, address, lat, lng, types, fetchedAt: now },
    });

    insertedOrUpdated++;
  }

  console.log(
    JSON.stringify({ ok: true, uniquePlaces: map.size, insertedOrUpdated }, null, 2)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
