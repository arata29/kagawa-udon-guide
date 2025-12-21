import AutoRanking from "./rankings/auto/page";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return AutoRanking({ searchParams });
}
