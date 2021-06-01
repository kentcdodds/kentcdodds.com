/*
  Warnings:

  - The values [UNDECIDED] on the enum `Team` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `team` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Team_new" AS ENUM ('BLUE', 'RED', 'YELLOW');
ALTER TABLE "User" ALTER COLUMN "team" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "team" TYPE "Team_new" USING ("team"::text::"Team_new");
ALTER TYPE "Team" RENAME TO "Team_old";
ALTER TYPE "Team_new" RENAME TO "Team";
DROP TYPE "Team_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "team" SET NOT NULL,
ALTER COLUMN "team" DROP DEFAULT;
