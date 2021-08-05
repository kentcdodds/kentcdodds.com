-- AlterTable
ALTER TABLE "Call" ALTER COLUMN "keywords" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PostRead" ADD COLUMN     "clientId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
