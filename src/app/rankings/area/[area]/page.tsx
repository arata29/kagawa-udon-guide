import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bayesScore } from "@/lib/ranking";

/**
 * URLエンコード済み文字列を安全にデコードする
 * - 壊れていても落ちないよう try/catch
 */
function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default async function AreaRanking(props: {
  params: Promise<{ area: string }>;
}) {
  const { area: rawArea } = await props.params;

  // /rankings/area/%E9%AB%98%E6%9D%BE%E5%B8%82 のようなURLを想定してデコード
  const area = safeDecode(rawArea).trim();

  // area が空文字になるケースをガード（壊れたURL対策）
  if (!area) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <section className="app-card">
          <h1 className="text-xl font-bold">不正なURLです</h1>
          <p className="mt-3 text-sm app-muted">area が空です。</p>
          <div className="mt-5">
            <Link className="text-sm underline" href="/rankings">
              ← ランキング一覧へ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // 対象の抽出：area が一致する店（DBに area を保存している前提）
  const rows = await prisma.placeCache.findMany({
    where: {
      rating: { not: null },
      userRatingCount: { not: null },
      area: area, // contains ではなく一致にして誤爆を減らす
    },
    select: {
      placeId: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      rating: true,
      userRatingCount: true,
      googleMapsUri: true,
    },
  });

  if (rows.length === 0) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <section className="app-card">
          <h1 className="text-2xl font-bold">{area} のランキング</h1>
          <p className="mt-4 text-sm app-muted">対象データがありません。</p>
          <div className="mt-6">
            <Link className="underline text-sm" href="/rankings">
              ← ランキング一覧へ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // エリア内の平均評価
  const C = rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length;
  const m = 50;

  const ranked = rows
    .map((r) => {
      const R = r.rating ?? 0;
      const v = r.userRatingCount ?? 0;
      return { ...r, score: bayesScore(R, v, C, m) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{area} のランキング</h1>
          <p className="mt-2 text-sm app-muted">
            ベイズ平均（m={m}, C={C.toFixed(2)}）
          </p>
        </div>
        <Link className="underline text-sm" href="/rankings">
          ランキング一覧
        </Link>
      </header>

      <ol className="mt-6 space-y-4">
        {ranked.map((r, idx) => {
          const openMapsUrl =
            r.googleMapsUri ??
            (r.lat != null && r.lng != null
              ? `https://www.google.com/maps?q=${r.lat},${r.lng}&z=16`
              : `https://www.google.com/maps?q=${encodeURIComponent(
                  `${r.name} ${r.address ?? ""}`
                )}&z=16`);

          return (
            <li key={r.placeId} className="app-card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="app-badge">{idx + 1}</span>
                    <div className="font-semibold break-words">{r.name}</div>
                  </div>

                  {r.address && (
                    <div className="mt-2 text-sm app-muted break-words">
                      {r.address}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="app-badge">★ {r.rating}</span>
                    <span className="app-badge">{r.userRatingCount} 件</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    href={openMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Googleマップで開く
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
