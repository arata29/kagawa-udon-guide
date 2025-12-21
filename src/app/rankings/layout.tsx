import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング一覧",
  description:
    "香川県うどんランキングの一覧ページ。総合ランキングとエリア別ランキングをチェックできます。",
};

export default function RankingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
