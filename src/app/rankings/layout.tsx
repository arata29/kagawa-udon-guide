import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ランキング一覧",
  description: "香川県うどんランキングの一覧。総合/エリア別ランキングをチェック。",
};

export default function RankingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
