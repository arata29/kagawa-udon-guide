-- AlterTable
ALTER TABLE "PlaceCache" ADD COLUMN     "openDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
