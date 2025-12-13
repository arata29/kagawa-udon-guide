/*
  Warnings:

  - You are about to drop the column `summary` on the `Place` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Place` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Place" DROP COLUMN "summary",
DROP COLUMN "tags";
