import type { Metadata } from "next";
import AutoRanking from "./rankings/auto/page";

export const metadata: Metadata = {
  title: "香川県うどんランキング",
  description:
    "香川県のうどん店をGoogleの評価とレビュー件数で総合ランキング。人気店を地図・一覧でも確認できます。",
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
