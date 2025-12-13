import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// サイト全体のメタ情報（検索結果やSNSシェア時の表示に使われる）
export const metadata: Metadata = {
  title: "香川県うどんランキング",
  description: "香川県のうどん屋を自動収集して表示します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* body に最低限のベーススタイルを当てて、全ページで見た目を統一 */}
      <body>
        {/* ヘッダー：全ページ共通ナビ */}
        <header className="site-header border-b">
          <div className="max-w-3xl mx-auto p-4 flex items-center justify-between gap-4">
            {/* ロゴ（= トップへの導線） */}
            <Link
              href="/"
              className="font-bold tracking-tight hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
            >
              香川県うどんランキング
            </Link>

            {/* ナビゲーション（リンクを一つにまとめる） */}
            <nav aria-label="Global navigation" className="flex gap-4 text-sm">
              <Link
                href="/"
                className="underline underline-offset-4 hover:no-underline focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
              >
                一覧
              </Link>

              <Link
                href="/rankings"
                className="underline underline-offset-4 hover:no-underline focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
              >
                ランキング
              </Link>
            </nav>
          </div>
        </header>

        {/* main：各ページの中身 */}
        <main className="max-w-3xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
