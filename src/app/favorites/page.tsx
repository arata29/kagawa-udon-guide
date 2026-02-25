import type { Metadata } from "next";
import UdonIcon from "@/components/UdonIcon";
import Breadcrumb from "@/components/Breadcrumb";
import RecentlyViewedList from "@/components/RecentlyViewedList";
import FavoritesList from "./FavoritesList";

export const metadata: Metadata = {
  title: "お気に入り | 香川県うどんランキング",
  description: "お気に入りに登録したうどん店の一覧です。",
};

export default function FavoritesPage() {
  return (
    <main className="app-shell page-in">
      <Breadcrumb
        items={[
          { label: "ホーム", href: "/" },
          { label: "お気に入り" },
        ]}
      />
      <section className="app-hero">
        <div>
          <p className="app-kicker">Favorites</p>
          <h1 className="app-title">
            <UdonIcon className="app-title-icon" />
            お気に入り
          </h1>
          <p className="app-lead">
            ハートボタンで追加した店舗が表示されます。
          </p>
        </div>
      </section>

      <div className="mt-6">
        <FavoritesList />
      </div>
      <div className="mt-6">
        <RecentlyViewedList maxItems={8} />
      </div>
    </main>
  );
}
