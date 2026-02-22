-- CreateTable
CREATE TABLE "CallKentEpisodeDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "step" TEXT NOT NULL DEFAULT 'STARTED',
    "errorMessage" TEXT,
    "responseBase64" TEXT NOT NULL,
    "episodeBase64" TEXT,
    "transcript" TEXT,
    "title" TEXT,
    "description" TEXT,
    "keywords" TEXT,
    "callId" TEXT NOT NULL,
    CONSTRAINT "CallKentEpisodeDraft_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallKentCallerEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "callTitle" TEXT NOT NULL,
    "callNotes" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "transistorEpisodeId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "episodeTitle" TEXT NOT NULL,
    "episodePath" TEXT NOT NULL,
    "imageUrl" TEXT,
    CONSTRAINT "CallKentCallerEpisode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "base64" TEXT NOT NULL,
    CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Call" ("base64", "createdAt", "id", "isAnonymous", "title", "updatedAt", "userId") SELECT "base64", "createdAt", "id", "isAnonymous", "title", "updatedAt", "userId" FROM "Call";
DROP TABLE "Call";
ALTER TABLE "new_Call" RENAME TO "Call";
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CallKentEpisodeDraft_callId_key" ON "CallKentEpisodeDraft"("callId");

-- CreateIndex
CREATE INDEX "CallKentEpisodeDraft_status_updatedAt_idx" ON "CallKentEpisodeDraft"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "CallKentEpisodeDraft_callId_idx" ON "CallKentEpisodeDraft"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "CallKentCallerEpisode_transistorEpisodeId_key" ON "CallKentCallerEpisode"("transistorEpisodeId");

-- CreateIndex
CREATE INDEX "CallKentCallerEpisode_userId_createdAt_idx" ON "CallKentCallerEpisode"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CallKentCallerEpisode_seasonNumber_episodeNumber_idx" ON "CallKentCallerEpisode"("seasonNumber", "episodeNumber");

