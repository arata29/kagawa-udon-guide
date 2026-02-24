import type { Metadata } from "next";
import Link from "next/link";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "香川県うどんランキングのプライバシーポリシー。Cookie・アクセス解析・広告配信・個人情報の取り扱いについて説明しています。",
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
      <Breadcrumb items={[{ label: "ホーム", href: "/" }, { label: "プライバシーポリシー" }]} />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Privacy</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            プライバシーポリシー
          </h1>
          <p className="app-lead">
            本サイトにおける個人情報・Cookie等の取り扱い方針です。
          </p>
        </div>
      </section>

      <section className="app-card mt-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-2">基本方針</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイト（香川県うどんランキング）は、ユーザーのプライバシーを尊重し、
              個人情報の適切な管理・保護に努めます。
              本ポリシーは、本サイトが取得する情報の種類・利用目的・管理方法について説明します。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Cookie・類似技術の利用</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトでは、サービスの品質向上や広告配信の最適化のために
              Cookie および類似の技術を使用しています。
            </p>
            <p>
              Cookie はブラウザに保存される小さなデータファイルです。
              ブラウザの設定からCookieを無効にすることができますが、
              一部の機能が正常に動作しなくなる場合があります。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">アクセス解析</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトでは、Vercel Analytics を利用してアクセス状況を計測しています。
              閲覧ページ・参照元・デバイス種別などの情報を匿名で収集しますが、
              個人を特定する情報は取得しません。
            </p>
            <p>
              収集したデータはサイトの品質向上・利便性改善の目的にのみ利用します。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Google マップ埋め込みについて</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトの店舗詳細ページでは、Google LLC が提供する Google マップを
              埋め込み形式で表示しています。この機能により、Google のサーバーから
              コンテンツが直接読み込まれ、Google による Cookie の設定や
              アクセス情報の収集が行われる場合があります。
            </p>
            <p>
              Google マップの利用に関するプライバシーポリシーは
              <a
                className="underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Google プライバシーポリシー
              </a>
              をご確認ください。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Google AdSense（広告配信）</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトでは、Google LLC が提供する広告配信サービス
              「Google AdSense」を使用しています。
              Google AdSense は、ユーザーの興味・関心に基づいたパーソナライズ広告を
              表示するために Cookie を利用します。
            </p>
            <p>
              広告 Cookie の利用を望まない場合は、
              <a
                className="underline"
                href="https://adssettings.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Google 広告設定
              </a>
              からパーソナライズ広告をオフにすることができます。
              また、
              <a
                className="underline"
                href="https://optout.networkadvertising.org/"
                target="_blank"
                rel="noreferrer"
              >
                NAI のオプトアウトページ
              </a>
              からも設定変更が可能です。
            </p>
            <p>
              Google の広告に関するプライバシーポリシーの詳細は
              <a
                className="underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
              >
                Google プライバシーポリシー
              </a>
              をご覧ください。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">お問い合わせフォームで取得する情報</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              <Link className="underline" href="/contact">お問い合わせフォーム</Link>からご連絡いただいた際、
              メールアドレス・お名前・お問い合わせ内容を取得します。
            </p>
            <p>
              取得した情報は、お問い合わせへの返信・対応のみを目的として利用し、
              法令に基づく場合を除き第三者に提供しません。
              対応が完了した後、不要となった情報は適切に削除します。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">外部リンクについて</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本サイトには Google Maps など外部サービスへのリンクが含まれています。
              リンク先のプライバシーポリシーについては各サービスをご確認ください。
              本サイトは外部リンク先での情報取り扱いについて責任を負いません。
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">ポリシーの変更</h2>
          <div className="space-y-2 text-sm app-text">
            <p>
              本ポリシーは、法令の改正や運営方針の変更に応じて予告なく改定する場合があります。
              変更後のポリシーは本ページに掲載した時点で効力を生じます。
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
          <Link className="app-button app-button--ghost" href="/terms">利用規約</Link>
          <Link className="app-button app-button--ghost" href="/contact">お問い合わせ</Link>
        </div>
      </section>
    </main>
  );
}
