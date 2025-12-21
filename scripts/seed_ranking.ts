import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 高松TOP10（slugはURL用）
  const ranking = await prisma.ranking.upsert({
    where: { slug: "top10-takamatsu" },
    create: {
      slug: "top10-takamatsu",
      title: "高松のおすすめうどん10選",
      description:
        "編集部の目線で選んだおすすめ店。最新情報は各店舗の公式情報をご確認ください。",
      area: "高松",
    },
    update: {},
  });

  // placeId は PlaceCache を参照して表示する
  const items = [
    { rank: 1, placeId: "PLACE_ID_1", note: "コシが強くて人気", recommend: "かけ" },
    { rank: 2, placeId: "PLACE_ID_2", note: "だしの旨味が濃い", recommend: "ぶっかけ" },
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
