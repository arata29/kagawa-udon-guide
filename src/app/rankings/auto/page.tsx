import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bayesScore } from "@/lib/ranking";

export default async function AutoRanking() {
  // 評価と件数が揃っている店だけランキング対象にする
  // ※ 香川県縛りは address で暫定（より確実にするなら area / isKagawa フラグなどをDBに持つのがおすすめ）
  const rows = await prisma.placeCache.findMany({
    where: {
      rating: { not: null },
      userRatingCount: { not: null },
      OR: [{ address: { contains: "香川県" } }, { address: { contains: "Kagawa" } }],
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
          <h1 className="text-xl font-bold">自動ランキング</h1>
          <p className="mt-3 text-sm app-muted">
            まだ評価データがありません。（sync:details を実行してください）
          </p>
          <div className="mt-5">
            <Link className="text-sm underline" href="/rankings">
              ← ランキング一覧へ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // 全体平均 C（全店の平均評価）
  const C = rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length;

  // m: 下駄（レビュー件数の“最低信用ライン”）
  const m = 50; // 好みで 30〜100 くらい

  // ベイズ平均でスコア化し、上位を抽出
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
          <h1 className="text-2xl font-bold">自動ランキング（レビュー評価ベース）</h1>
          <p className="mt-2 text-sm app-muted">
            スコア = ベイズ平均（m={m} / 平均C={C.toFixed(2)}）
          </p>
        </div>
        <Link className="text-sm underline" href="/rankings">
          ランキング一覧
        </Link>
      </header>

      <ol className="mt-6 space-y-4">
        {ranked.map((r, idx) => {
          // Google Maps URL（place詳細が無くても開けるように fallback）
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
                {/* 左：順位と店名 */}
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

                  {/* 評価バッジ */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="app-badge">★ {r.rating}</span>
                    <span className="app-badge">{r.userRatingCount} 件</span>
                  </div>

                  {/* スコア表示（納得感UP。不要なら削除OK） */}
                  <div className="mt-2 text-xs app-muted">
                    score: {r.score.toFixed(3)}
                  </div>
                </div>

                {/* 右：ボタン */}
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

      <p className="mt-8 text-xs app-muted">
        ※評価/件数は Google Places のデータに基づきます。最新化は sync:details の実行タイミングに依存します。
      </p>
    </main>
  );
}
