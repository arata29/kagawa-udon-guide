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

// 香川県中心付近（バイアス用）
const CENTERS = [
    { latitude: 34.3428, longitude: 134.0466 }, // 高松
    { latitude: 34.2840, longitude: 133.7850 }, // 丸亀寄り（西側）
    { latitude: 34.3000, longitude: 134.3000 }, // さぬき寄り（東側）
];

const RADIUS_M = 50000;

// 漏れ対策：市町村名や表記ゆれを増やすほど強くなる
const QUERIES = [
    "香川県 うどん",
    "讃岐うどん 香川",
    "高松市 うどん",
    "丸亀市 うどん",
    "坂出市 うどん",
    "善通寺市 うどん",
    "観音寺市 うどん",
    "さぬき市 うどん",
    "三豊市 うどん",
    "東かがわ市 うどん",
    "宇多津町 うどん",
    "多度津町 うどん",
    "土庄町 うどん",
    "小豆島町 うどん",
    "三木町 うどん",
    "直島町 うどん",
    "綾川町 うどん",
    "琴平町 うどん",
    "まんのう町 うどん"
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function textSearchAll(
    textQuery: string,
    center: { latitude: number; longitude: number }
): Promise<Place[]> {
    const results: Place[] = [];
    let pageToken: string | undefined;

    for (let i = 0; i < 4; i++) {
        const body: any = {
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

    // 取得：複数クエリ→ place_id で重複排除
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
        JSON.stringify(
            { ok: true, uniquePlaces: map.size, insertedOrUpdated },
            null,
            2
        )
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
