import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営者情報",
  description: "香川県うどんランキングの運営者情報と運営方針。",
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
          <p className="app-lead">
            本サイトの運営目的・更新方針をご案内します。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-3 text-sm app-text">
          <p>サイト名: 香川県うどんランキング</p>
          <p>運営者: 香川県在住の個人</p>
          <p>
            目的: 香川県の讃岐うどん店を探しやすくし、比較しながら選べるようにすること。
          </p>
          <p>
            情報源: Google Maps の公開情報を参考にし、評価・レビュー件数をもとに掲載しています。
          </p>
          <p>更新方針: 可能な範囲で定期的に更新します。</p>
          <p>お問い合わせ: お問い合わせページからご連絡ください。</p>
        </div>
      </section>
    </main>
  );
}
