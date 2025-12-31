-- AlterTable
ALTER TABLE "PlaceCache" ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "utcOffsetMinutes" INTEGER;
