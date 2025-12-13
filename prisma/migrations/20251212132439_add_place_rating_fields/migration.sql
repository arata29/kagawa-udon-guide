-- AlterTable
ALTER TABLE "PlaceCache" ADD COLUMN     "googleMapsUri" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "userRatingCount" INTEGER;
