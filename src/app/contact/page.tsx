import type { Metadata } from "next";
import Link from "next/link";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import ContactForm from "./ContactForm";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "香川県うどんランキングへのお問い合わせはこちら。掲載内容の修正依頼・情報追加・ご意見・ご要望をフォームからお送りいただけます。",
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
      <Breadcrumb items={[{ label: "ホーム", href: "/" }, { label: "お問い合わせ" }]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Contact</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            お問い合わせ
          </h1>
          <p className="app-lead">
            掲載内容の修正依頼やご意見はこちらからお願いします。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <p className="app-muted">下記フォームに入力して送信してください。</p>
        <ContactForm />
      </section>

      <section className="app-card mt-6">
        <h2 className="text-sm font-semibold mb-3">関連ページ</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="app-button app-button--ghost" href="/about">運営者情報</Link>
          <Link className="app-button app-button--ghost" href="/privacy">プライバシーポリシー</Link>
          <Link className="app-button app-button--ghost" href="/terms">利用規約</Link>
        </div>
      </section>
    </main>
  );
}
