import Link from "next/link";
import UdonIcon from "@/components/UdonIcon";

export default function NotFound() {
  return (
    <main className="app-shell page-in">
      <section className="app-hero">
        <div>
          <p className="app-kicker">404 Not Found</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            ページが見つかりません
          </h1>
          <p className="app-lead">
            お探しのページは存在しないか、移動・削除された可能性があります。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link className="app-button" href="/">
              トップへ戻る
            </Link>
            <Link className="app-button app-button--ghost" href="/list">
              店舗一覧
            </Link>
            <Link className="app-button app-button--ghost" href="/rankings">
              ランキング
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
