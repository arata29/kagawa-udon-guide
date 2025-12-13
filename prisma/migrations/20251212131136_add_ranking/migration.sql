-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingItem" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "note" TEXT,
    "recommend" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_slug_key" ON "Ranking"("slug");

-- CreateIndex
CREATE INDEX "RankingItem_placeId_idx" ON "RankingItem"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingItem_rankingId_rank_key" ON "RankingItem"("rankingId", "rank");

-- AddForeignKey
ALTER TABLE "RankingItem" ADD CONSTRAINT "RankingItem_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
