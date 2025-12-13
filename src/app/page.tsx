import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SP = { q?: string; page?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  // 検索キーワード / ページング
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const take = 30;
  const skip = (page - 1) * take;

  // 検索条件（qがあるときだけ）
  const where = q
    ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { address: { contains: q, mode: "insensitive" as const } },
      ],
    }
    : undefined;

  // 新着順（fetchedAt DESC）固定：ソート機能は削除
  const orderBy = [{ fetchedAt: "desc" as const }];

  const [total, places] = await Promise.all([
    prisma.placeCache.count({ where }),
    prisma.placeCache.findMany({ where, orderBy, take, skip }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  // ページングリンク生成（q/pageのみ保持）
  const mkHref = (next: Partial<SP>) => {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const np = next.page ?? String(page);
    if (nq) params.set("q", nq);
    params.set("page", np);
    return `/?${params.toString()}`;
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      {/* タイトル */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">香川うどん（自動収集）</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Google Places から収集した香川県内のうどん店候補を一覧表示します。
          </p>
        </div>

        <Link className="text-sm underline" href="/rankings">
          ランキング →
        </Link>
      </div>

      {/* 検索カード */}
      <section className="app-card mt-5">
        <form className="flex flex-col sm:flex-row gap-2" action="/" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="店名/住所で検索（例：高松）"
            className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/40"
          />

          {/* 検索時はページを1に戻す */}
          <input type="hidden" name="page" value="1" />

          <button
            type="submit"
            className="rounded-xl border px-4 py-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            検索
          </button>

          {/* q が入っているときだけ表示 */}
          {q && (
            <Link
              href="/?page=1"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              クリア
            </Link>
          )}
        </form>

        <div className="mt-3 text-xs app-muted">
          {total}件　{page}/{totalPages}ページ
        </div>
      </section>


      {/* 一覧：強い罫線 → 丸いカード */}
      {places.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <p className="text-card text-gray-600 dark:text-gray-300">
            該当するお店がありません。
          </p>
        </div>
      ) : (
        <ul className="mt-6 list-none p-0 space-y-4">
          {places.map((p) => {
            const openMapsUrl =
              p.googleMapsUri ??
              (p.lat != null && p.lng != null
                ? `https://www.google.com/maps?q=${p.lat},${p.lng}&z=16`
                : `https://www.google.com/maps?q=${encodeURIComponent(
                  `${p.name} ${p.address ?? ""}`
                )}&z=16`);

            return (
              <li key={p.placeId} className="app-card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* 左：店情報 */}
                  <div className="min-w-0">
                    <div className="font-semibold break-words">{p.name}</div>

                    {p.address && (
                      <div className="mt-1 text-sm app-muted break-words">{p.address}</div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.rating != null && <span className="app-badge">★ {p.rating}</span>}
                      {p.userRatingCount != null && <span className="app-badge">{p.userRatingCount} 件</span>}
                    </div>
                  </div>

                  {/* 右：ボタン */}
                  <div className="flex gap-2 sm:flex-col sm:items-end">
                    <a
                      href={openMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-black/10 px-3 py-2 text-card hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      Googleマップで開く
                    </a>

                    {/* 詳細導線は残すがボタンはOFF（必要になったら戻す）
                    <Link
                      href={`/shops/${encodeURIComponent(p.placeId)}`}
                      className="inline-flex items-center justify-center rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      詳細を見る
                    </Link>
                    */}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ページング */}
      <nav className="mt-8 flex justify-between text-sm">
        <Link
          className={`underline ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          href={mkHref({ page: String(page - 1) })}
        >
          ← 前へ
        </Link>

        <span className="text-sm">
          {page}/{totalPages}
        </span>

        <Link
          className={`underline ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
          href={mkHref({ page: String(page + 1) })}
        >
          次へ →
        </Link>
      </nav>
    </main>
  );
}
