-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('udon', 'ramen');

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "category" "PlaceCategory" NOT NULL DEFAULT 'udon';

-- AlterTable
ALTER TABLE "PlaceCache" ADD COLUMN     "category" "PlaceCategory" NOT NULL DEFAULT 'udon';
