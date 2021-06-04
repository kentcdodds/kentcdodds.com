/*
  Warnings:

  - You are about to drop the column `postId` on the `PostRead` table. All the data in the column will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `postSlug` to the `PostRead` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PostRead" DROP CONSTRAINT "PostRead_postId_fkey";

-- AlterTable
ALTER TABLE "PostRead" DROP COLUMN "postId",
ADD COLUMN     "postSlug" TEXT NOT NULL;

-- DropTable
DROP TABLE "Post";
