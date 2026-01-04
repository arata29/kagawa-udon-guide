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
          <p className="app-lead">
            本サイトをご利用いただく際の注意事項です。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-3 text-sm app-text">
          <div className="font-semibold">免責事項</div>
          <p>
            掲載情報の正確性には注意していますが、最新性・正確性を保証するものではありません。
          </p>
          <p>
            外部サービスへのリンク先で生じた損害について当サイトは責任を負いません。
          </p>
          <p>
            当サイトの情報を利用したことにより生じた損害について、当サイトは一切責任を負いません。
          </p>
          <p>
            店舗の営業時間や料金等は変更される場合があります。来店前に公式情報でご確認ください。
          </p>
          <p>
            掲載内容は予告なく変更・削除する場合があります。
          </p>
          <p>
            掲載内容の修正が必要な場合は、お問い合わせページよりご連絡ください。
          </p>
          <p>本規約は予告なく変更する場合があります。</p>
        </div>
      </section>
    </main>
  );
}
