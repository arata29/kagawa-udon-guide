-- AlterTable
ALTER TABLE "PlaceCache" DROP COLUMN "category";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "category";

-- DropEnum
DROP TYPE "PlaceCategory";
