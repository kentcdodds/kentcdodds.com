/*
  Warnings:

  - You are about to drop the column `episodeId` on the `Call` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Call" DROP COLUMN "episodeId",
ADD COLUMN     "keywords" TEXT DEFAULT E'', -- first autofill all keywords with an empty string
ALTER COLUMN "keywords" SET NOT NULL; -- then set it to not null
