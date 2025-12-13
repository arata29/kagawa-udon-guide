import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 例：高松TOP10（slugがURLになる）
  const ranking = await prisma.ranking.upsert({
    where: { slug: "top10-takamatsu" },
    create: {
      slug: "top10-takamatsu",
      title: "高松のおすすめうどん10選",
      description: "自分の好みで選んだ推し店。随時更新。",
      area: "高松",
    },
    update: {},
  });

  // placeId は PlaceCache から拾って貼る（後述）
  const items = [
    { rank: 1, placeId: "PLACE_ID_1", note: "出汁が最高", recommend: "かけ" },
    { rank: 2, placeId: "PLACE_ID_2", note: "麺が強い", recommend: "ぶっかけ" },
  ];

  for (const it of items) {
    await prisma.rankingItem.upsert({
      where: { rankingId_rank: { rankingId: ranking.id, rank: it.rank } },
      create: { rankingId: ranking.id, ...it },
      update: { ...it },
    });
  }

  console.log("seed done:", ranking.slug, items.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
