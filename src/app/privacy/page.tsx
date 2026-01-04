import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "香川県うどんランキングのプライバシーポリシー。",
};

export default function PrivacyPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "プライバシーポリシー",
        item: `${siteUrl}/privacy`,
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
          <p className="app-kicker">Privacy</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            プライバシーポリシー
          </h1>
          <p className="app-lead">
            本サイトにおける個人情報等の取り扱い方針です。
          </p>
        </div>
      </section>

      <section className="app-card mt-6">
        <div className="space-y-3 text-sm app-text">
          <div className="font-semibold">取得する情報と利用目的</div>
          <p>
            本サイトでは、サービス向上や広告配信のために Cookie 等の技術を利用する場合があります。
          </p>
          <p>
            Google AdSense などの第三者配信事業者が Cookie を使用し、ユーザーのアクセス情報に基づいた広告を配信することがあります。
          </p>
          <p>
            アクセス解析のために、閲覧したページや参照元などの情報を取得する場合がありますが、個人を特定する情報は取得しません。
          </p>
          <p>
            取得した情報はサイトの品質向上・利便性改善の目的にのみ利用し、法令に基づく場合を除き第三者に提供しません。
          </p>
          <p>外部リンク先のサービスについては当サイトでは責任を負いません。</p>
          <p>本ポリシーは予告なく変更する場合があります。</p>
          <div className="text-sm app-text">
            <div className="font-semibold">広告のオプトアウト</div>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <a
                  className="underline"
                  href="https://adssettings.google.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google 広告設定
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google アドマネージャーの広告設定
                </a>
              </li>
              <li>
                <a
                  className="underline"
                  href="https://optout.networkadvertising.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NAI のオプトアウトページ
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
