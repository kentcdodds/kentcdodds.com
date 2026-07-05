-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CallKentEpisodeDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "step" TEXT NOT NULL DEFAULT 'STARTED',
    "errorMessage" TEXT,
    "episodeAudioKey" TEXT,
    "episodeAudioContentType" TEXT,
    "episodeAudioSize" INTEGER,
    "transcript" TEXT,
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "callId" TEXT NOT NULL,
    CONSTRAINT "CallKentEpisodeDraft_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CallKentEpisodeDraft" ("callId", "createdAt", "description", "episodeAudioContentType", "episodeAudioKey", "episodeAudioSize", "errorMessage", "id", "keywords", "status", "step", "title", "transcript", "updatedAt") SELECT "callId", "createdAt", "description", "episodeAudioContentType", "episodeAudioKey", "episodeAudioSize", "errorMessage", "id", "keywords", "status", "step", "title", "transcript", "updatedAt" FROM "CallKentEpisodeDraft";
DROP TABLE "CallKentEpisodeDraft";
ALTER TABLE "new_CallKentEpisodeDraft" RENAME TO "CallKentEpisodeDraft";
CREATE UNIQUE INDEX "CallKentEpisodeDraft_callId_key" ON "CallKentEpisodeDraft"("callId");
CREATE INDEX "CallKentEpisodeDraft_status_updatedAt_idx" ON "CallKentEpisodeDraft"("status", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

