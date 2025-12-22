import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import ContactForm from "./ContactForm";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "香川県うどんランキングへのお問い合わせ窓口。掲載内容の修正などはこちらから。",
};

export default function ContactPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "お問い合わせ",
        item: `${siteUrl}/contact`,
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
          <p className="app-kicker">Contact</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            お問い合わせ
          </h1>
          <p className="app-lead">
            掲載内容の修正依頼などはこちらからお願いします。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <p className="app-muted">内容を入力して送信してください。</p>
        <ContactForm />
      </section>
    </main>
  );
}
