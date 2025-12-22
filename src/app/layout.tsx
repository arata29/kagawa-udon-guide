import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const sans = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Noto_Serif_JP({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const siteTitle = "香川県うどんランキング";
const siteDescription =
  "香川県のうどん店をランキング・一覧・地図で探せる情報サイト。評価とレビュー件数から人気店を比較できます。";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  },
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  verification: {
    google: "oMaOgF_g2RrD8nmfFZVzaZ_0RwMs0VriqBIz_oBXPH8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteTitle,
      url: siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteTitle,
      url: siteUrl,
    },
  ];

  return (
    <html lang="ja" className={`${sans.variable} ${display.variable}`}>
      <body className="app-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <header className="site-header border-b">
          <div className="app-shell app-shell--header flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
            <Link
              href="/"
              className="brand focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
            >
              <UdonIcon className="brand-icon" />
              <span className="brand-text">{siteTitle}</span>
            </Link>

            <nav aria-label="Global navigation" className="app-nav text-sm">
              <Link
                href="/list"
                className="app-nav-link focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
              >
                一覧
              </Link>

              <Link
                href="/rankings"
                className="app-nav-link focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
              >
                ランキング
              </Link>
              <Link
                href="/map"
                className="app-nav-link focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
              >
                マップ
              </Link>
              <Link
                href="/contact"
                className="app-nav-link focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
              >
                お問い合わせ
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="app-shell">
            <div className="footer-grid">
              <div>
                <div className="footer-title">サイト概要</div>
                <p className="footer-text">
                  香川県内のうどん店をランキング・一覧・地図で探せる情報サイトです。
                </p>
              </div>

              <div>
                <div className="footer-title">ナビリンク</div>
                <div className="footer-links">
                  <Link className="footer-link" href="/">
                    総合ランキング
                  </Link>
                  <Link className="footer-link" href="/rankings">
                    エリア別ランキング
                  </Link>
                  <Link className="footer-link" href="/list">
                    一覧
                  </Link>
                  <Link className="footer-link" href="/map">
                    マップ
                  </Link>
                </div>
              </div>

              <div>
                <div className="footer-title">更新情報</div>
                <p className="footer-text">最終更新はランキングページに表示しています。</p>
                <a
                  className="footer-link"
                  href="https://developers.google.com/maps/documentation/places"
                  target="_blank"
                  rel="noreferrer"
                >
                  データ出典: Google Places
                </a>
              </div>

              <div>
                <div className="footer-title">お問い合わせ</div>
                <div className="footer-links">
                  <Link className="footer-link" href="/contact">
                    お問い合わせフォーム
                  </Link>
                </div>
              </div>

              <div>
                <div className="footer-title">規約・ポリシー</div>
                <div className="footer-links">
                  <Link className="footer-link" href="/terms">
                    利用規約
                  </Link>
                  <Link className="footer-link" href="/privacy">
                    プライバシー
                  </Link>
                </div>
              </div>
            </div>

            <div className="footer-note">
              <span>※評価/件数は Google Places のデータに基づきます。</span>
              <span>掲載・修正依頼はお問い合わせページへ。</span>
            </div>
          </div>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
