import type { Metadata } from "next";
import AutoRanking from "./rankings/auto/page";

export const metadata: Metadata = {
  title: "【香川】讃岐うどん総合ランキング",
  description:
    "香川の讃岐うどん人気・おすすめ店をGoogleMapから店情報を自動取得し、評価とレビュー件数で総合ランキング。比較に便利です。",
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
