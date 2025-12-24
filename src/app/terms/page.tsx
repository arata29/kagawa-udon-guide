import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "利用規約",
  description: "香川県うどんランキングの利用規約。",
};

export default function TermsPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "利用規約",
        item: `${siteUrl}/terms`,
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
          <p className="app-kicker">Terms</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            利用規約
          </h1>
          <p className="app-lead">本サイトのご利用にあたってのご案内です。</p>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-3 text-sm app-text">
          <p>
            掲載情報の正確性には注意していますが、最新性を保証するものではありません。
          </p>
          <p>
            外部サービスへのリンク先で生じた損害については責任を負いません。
          </p>
          <p>
            当サイトの情報を利用したことにより生じた損害について、当サイトは一切の責任を負いません。
          </p>
          <p>
            店舗の営業時間、料金等は変更される場合があります。来店前に公式情報でご確認ください。
          </p>
          <p>
            掲載内容の正確性・完全性・有用性について保証するものではなく、予告なく内容を変更・削除する場合があります。
          </p>
          <p>掲載内容に修正が必要な場合は、お問い合わせページよりご連絡ください。</p>
          <p>規約の内容は予告なく変更する場合があります。</p>
        </div>
      </section>
    </main>
  );
}
