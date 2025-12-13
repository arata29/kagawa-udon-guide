import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ShopDetail(props: {
  params: Promise<{ placeId?: string }>;
}) {
  // Next.js: params が Promise のケースがあるため await して取り出す
  const { placeId } = await props.params;

  if (!placeId) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold">不正なURLです</h1>
        <p className="mt-2 text-sm text-gray-600">placeId がありません</p>
        <div className="mt-6">
          <Link className="underline text-sm" href="/">
            ← 一覧へ
          </Link>
        </div>
      </main>
    );
  }

  // 店データ（キャッシュ）をDBから取得
  const place = await prisma.placeCache.findUnique({
    where: { placeId },
  });

  if (!place) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold">見つかりませんでした</h1>
        <p className="mt-2 text-sm text-gray-600">place_id: {placeId}</p>
        <div className="mt-6">
          <Link className="underline text-sm" href="/">
            ← 一覧へ
          </Link>
        </div>
      </main>
    );
  }

  // 緯度経度があるなら、それを優先して地図を表示
  const hasLatLng = place.lat != null && place.lng != null;

  // 埋め込み（iframe）用 URL
  const mapEmbedUrl = hasLatLng
    ? `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(
        `${place.name} ${place.address ?? ""}`
      )}&z=16&output=embed`;

  // 「Googleマップを開く」リンクは googleMapsUri を優先
  const openMapsUrl =
    place.googleMapsUri ??
    (hasLatLng
      ? `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16`
      : `https://www.google.com/maps?q=${encodeURIComponent(
          `${place.name} ${place.address ?? ""}`
        )}&z=16`);

  // レビュー要約（DB保存済みの文字列を箇条書き配列に）
  const reviewBullets = place.reviewSummary
    ? place.reviewSummary
        .split("\n")
        .map((s) => s.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{place.name}</h1>

          {place.address && (
            <p className="text-sm text-gray-600 mt-2">{place.address}</p>
          )}

          {/* バッジ群（評価 / 件数 / types） */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
            {place.rating != null && (
              <span className="border rounded-full px-2 py-1 bg-white">
                ★ {place.rating}
              </span>
            )}
            {place.userRatingCount != null && (
              <span className="border rounded-full px-2 py-1 bg-white">
                {place.userRatingCount} 件
              </span>
            )}
            {place.types?.length ? (
              <span className="border rounded-full px-2 py-1 bg-white">
                {place.types.slice(0, 5).join(", ")}
              </span>
            ) : null}
          </div>
        </div>

        {/* ボタン群 */}
        <div className="flex flex-col gap-2">
          <a
            href={openMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Googleマップを開く
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            一覧に戻る
          </Link>
        </div>
      </div>

      {/* 地図 */}
      <div className="mt-6">
        <iframe
          title="map"
          src={mapEmbedUrl}
          className="w-full h-[360px] rounded-xl border shadow-sm"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* レビュー要約（表示したい時はコメント解除）
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
            まだ要約データがありません（sync:details 実行後に表示されます）
          </p>
        )}
      </section>
      */}

      <div className="mt-8 text-xs text-gray-400">place_id: {place.placeId}</div>
    </main>
  );
}
