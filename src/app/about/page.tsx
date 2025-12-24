import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営者情報",
  description: "香川県うどんランキングの運営者情報。",
};

export default function AboutPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "運営者情報",
        item: `${siteUrl}/about`,
      },
    ],
  };

  return (
    <main className="app-shell page-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="app-hero">
        <div>
          <p className="app-kicker">About</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            運営者情報
          </h1>
          <p className="app-lead">本サイトの運営者と目的についての情報です。</p>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-3 text-sm app-text">
          <p>サイト名: 香川県うどんランキング</p>
          <p>運営者: 香川県生まれ、香川県育ちの個人が運用しています。</p>
          <p>
            目的: 香川県内のうどん店情報を、評価・レビュー件数をもとに比較しやすく提供すること。
          </p>
          <p>お問い合わせ: お問い合わせページからご連絡ください。</p>
        </div>
      </section>
    </main>
  );
}
