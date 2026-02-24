import type { Metadata } from "next";
import Link from "next/link";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "香川県うどんランキングの利用規約。免責事項・著作権・禁止事項・外部リンクについて説明しています。",
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
      <Breadcrumb items={[{ label: "ホーム", href: "/" }, { label: "利用規約" }]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Terms</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            利用規約
          </h1>
          <p className="app-lead">
            本サイトをご利用いただく前にお読みください。
          </p>
        </div>
      </section>

      <section className="app-card mt-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-2">適用範囲</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本規約は、香川県うどんランキング（https://www.kagawa-guide-ranking.com、以下「本サイト」）を
              ご利用いただくすべての方に適用されます。
              本サイトをご利用いただくことで、本規約に同意したものとみなします。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">免責事項</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              掲載情報の正確性・最新性には十分注意していますが、
              完全な正確性・網羅性を保証するものではありません。
            </p>
            <p>
              店舗の営業時間・定休日・料金・メニュー等は予告なく変更される場合があります。
              来店前に各店舗の公式情報や Google Maps で最新情報をご確認ください。
            </p>
            <p>
              本サイトの情報を利用したことにより生じた損害・トラブルについて、
              当サイトは一切の責任を負いません。
            </p>
            <p>
              掲載内容は予告なく変更・削除する場合があります。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">著作権</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトに掲載されているテキスト・デザイン・構成等の著作権は、
              運営者または各権利者に帰属します。
            </p>
            <p>
              本サイトのコンテンツを、運営者の許可なく複製・転載・改変・再配布することを禁じます。
              個人利用の範囲内での引用・参照は、出典を明記のうえ行っていただけます。
            </p>
            <p>
              店舗情報（名称・住所・評価・営業時間等）は Google Places API から取得したデータを
              表示しており、各データの権利は Google LLC および各店舗に帰属します。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">禁止事項</h2>
          <div className="space-y-2 text-sm app-text">
            <p>本サイトのご利用にあたり、以下の行為を禁止します。</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>本サイトのサーバーやシステムに過度な負荷をかける行為</li>
              <li>本サイトのコンテンツを無断で複製・転載・販売する行為</li>
              <li>本サイトを利用した詐欺・スパム・迷惑行為</li>
              <li>法令または公序良俗に反する行為</li>
              <li>その他、当サイトが不適切と判断する行為</li>
            </ul>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">外部リンクについて</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトには Google Maps など外部サービスへのリンクが含まれています。
              外部リンク先のコンテンツや、リンク先での情報取り扱いについて
              当サイトは責任を負いません。
            </p>
            <p>
              本サイトへのリンクは原則として自由ですが、
              内容を誤解させる形でのリンクや、公序良俗に反するサイトからのリンクは
              お断りする場合があります。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">掲載内容の修正・削除依頼</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              掲載内容に誤りがある場合や、掲載の削除・修正をご希望の場合は、
              <Link className="underline" href="/contact">お問い合わせページ</Link>からご連絡ください。
              内容を確認のうえ、対応いたします。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">規約の変更</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本規約は、法令の改正や運営方針の変更に応じて予告なく改定する場合があります。
              変更後の規約は本ページに掲載した時点で効力を生じます。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">準拠法・管轄</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本規約は日本法に準拠し、本サイトに関する紛争は
              運営者の住所地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </div>
        </div>

        <div className="app-policy-date">
          制定日: 2024年／最終改定: 2025年
        </div>
      </section>

      <section className="app-card mt-6">
        <h2 className="text-sm font-semibold mb-3">関連ページ</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="app-button app-button--ghost" href="/about">運営者情報</Link>
          <Link className="app-button app-button--ghost" href="/privacy">プライバシーポリシー</Link>
          <Link className="app-button app-button--ghost" href="/contact">お問い合わせ</Link>
        </div>
      </section>
    </main>
  );
}
