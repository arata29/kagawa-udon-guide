import type { Metadata } from "next";
import Link from "next/link";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "運営者情報・讃岐うどんについて",
  description:
    "香川県うどんランキングの運営者情報・サイト概要・讃岐うどんの文化・ランキングの仕組み・更新方針をご案内します。",
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
      <Breadcrumb items={[{ label: "ホーム", href: "/" }, { label: "運営者情報" }]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">About</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            運営者情報
          </h1>
          <p className="app-lead">
            本サイトの概要・運営方針・ランキングの仕組み、讃岐うどんについてご案内します。
          </p>
        </div>
      </section>

      <section className="app-card mt-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-2">サイト概要</h2>
          <div className="space-y-2 text-sm app-text">
            <p>サイト名: 香川県うどんランキング</p>
            <p>URL: https://www.kagawa-guide-ranking.com</p>
            <p>運営者: 香川県在住の個人（讃岐うどん愛好家）</p>
            <p>連絡先: <Link className="underline" href="/contact">お問い合わせフォーム</Link></p>
            <p>
              香川生まれのうどん好きが、「どの店に行くか迷ったときに頼れるサイトが欲しい」
              という動機で制作・運営しています。
              観光で訪れる方にも地元の方にも、お気に入りの一杯を見つける手助けになれば幸いです。
            </p>
            <p>
              本サイトは、香川県内の讃岐うどん店を評価・レビュー件数などの
              データをもとにランキング・一覧・地図で比較できる情報サイトです。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">讃岐うどんについて</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              讃岐うどんは、香川県（旧讃岐国）で生まれた日本を代表するうどんです。
              小麦の産地として古くから知られる讃岐平野の風土と、
              いりこ（干したカタクチイワシ）から引いたコクのある出汁が合わさり、
              独自の食文化を育んできました。
            </p>
            <p>
              最大の特徴は「コシ」の強さです。しっかりと打ち込まれた生地を
              丁寧に踏み込むことで生まれる弾力は、他の産地のうどんにはない食感を生み出します。
              澄んでいても旨味の深い出汁と合わさることで、シンプルながら滋味ある一杯になります。
            </p>
            <p>
              香川県内には多くの店舗が点在しており、セルフ式の店が多いのも特徴のひとつです。
              大きな釜の前で自分でうどんを湯切りし、好みのトッピングを選ぶスタイルは、
              地元の日常食として長年愛されてきました。
              県外からの旅行者にとっても「うどん巡り」は香川観光の定番コースとなっています。
            </p>
            <p>
              代表的なスタイルには、温かいだし汁をかける「かけうどん」、
              冷水で締めた麺に濃いだしをかける「ぶっかけ」、
              釜から上げたての麺をそのまま楽しむ「釜揚げ」、
              生卵と混ぜ合わせる「釜玉」などがあります。
              高松・丸亀・坂出・善通寺など、エリアごとに人気の店舗が揃っており、
              複数の店をはしごするのが香川流の楽しみ方です。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">ランキングの仕組み</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              当サイトのランキングは、Google Maps（Google Places API）が公開している
              評価スコア（★1〜5）とレビュー件数をもとに、
              <strong>ベイズ平均（Bayesian Average）</strong>という統計手法でスコアを算出しています。
            </p>
            <p>
              ベイズ平均を使うことで、レビュー件数が少ない店が偶然高評価を得た場合でも
              過剰に上位に表示されないよう調整しています。
              より多くのレビューを持つ店が適切に評価される、信頼性の高いランキングを提供しています。
            </p>
            <p>
              エリア別ランキングは、香川県内の主要エリア（高松・丸亀・坂出など）ごとに
              確認できます。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">情報源・データについて</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              掲載している店舗情報（名称・住所・評価・営業時間など）は、
              Google Maps の公開情報（Google Places API）を取得・表示しています。
            </p>
            <p>
              掲載内容の正確性には十分注意していますが、営業時間・定休日・
              料金等は変更される場合があります。来店前には各店舗の公式情報や
              Google Maps でご確認ください。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">更新方針</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              店舗データは週1回程度を目安に自動更新しています。
              最終更新日は<Link className="underline" href="/rankings">ランキングページ</Link>に表示しています。
            </p>
            <p>
              新規店舗の追加や既存店舗の情報修正は、Google Maps のデータ更新に
              合わせて反映されます。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">掲載内容の修正について</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              掲載内容に誤りがある場合や、掲載の削除・修正をご希望の場合は、
              <Link className="underline" href="/contact">お問い合わせページ</Link>からご連絡ください。
              内容を確認のうえ、対応いたします。
            </p>
          </div>
        </div>
      </section>

      <section className="app-card mt-6">
        <h2 className="text-sm font-semibold mb-3">関連ページ</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="app-button app-button--ghost" href="/rankings">ランキングを見る</Link>
          <Link className="app-button app-button--ghost" href="/list">店舗一覧</Link>
          <Link className="app-button app-button--ghost" href="/contact">お問い合わせ</Link>
          <Link className="app-button app-button--ghost" href="/privacy">プライバシーポリシー</Link>
          <Link className="app-button app-button--ghost" href="/terms">利用規約</Link>
        </div>
      </section>
    </main>
  );
}
