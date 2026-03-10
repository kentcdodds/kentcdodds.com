-- AlterTable
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "episodeAudioContentType" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "episodeAudioKey" TEXT;
ALTER TABLE "CallKentEpisodeDraft" ADD COLUMN "episodeAudioSize" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "audioKey" TEXT,
    "audioContentType" TEXT,
    "audioSize" INTEGER,
    "base64" TEXT,
    CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Call" ("base64", "createdAt", "id", "isAnonymous", "notes", "title", "updatedAt", "userId") SELECT "base64", "createdAt", "id", "isAnonymous", "notes", "title", "updatedAt", "userId" FROM "Call";
DROP TABLE "Call";
ALTER TABLE "new_Call" RENAME TO "Call";
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

