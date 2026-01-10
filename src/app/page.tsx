import type { Metadata } from "next";
import AutoRanking from "./rankings/auto/page";

export const metadata: Metadata = {
  title: "【香川】讃岐うどんランキング｜人気店を総合比較",
  description:
    "香川の讃岐うどん人気・おすすめ店をGoogleMapの評価とレビュー件数で自動ランキング。総合で比較できます。",
  alternates: {
    canonical: "/",
  },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return <AutoRanking searchParams={searchParams} />;
}
