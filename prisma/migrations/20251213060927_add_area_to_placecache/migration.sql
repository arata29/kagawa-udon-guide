-- AlterTable
ALTER TABLE "PlaceCache" ADD COLUMN     "area" TEXT;

-- CreateIndex
CREATE INDEX "PlaceCache_area_idx" ON "PlaceCache"("area");
