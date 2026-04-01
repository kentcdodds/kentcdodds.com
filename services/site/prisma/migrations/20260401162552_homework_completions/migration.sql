-- CreateTable
CREATE TABLE "HomeworkCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    CONSTRAINT "HomeworkCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HomeworkCompletion_userId_seasonNumber_episodeNumber_idx" ON "HomeworkCompletion"("userId", "seasonNumber", "episodeNumber");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_clientId_seasonNumber_episodeNumber_idx" ON "HomeworkCompletion"("clientId", "seasonNumber", "episodeNumber");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_seasonNumber_episodeNumber_itemIndex_createdAt_idx" ON "HomeworkCompletion"("seasonNumber", "episodeNumber", "itemIndex", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkCompletion_userId_seasonNumber_episodeNumber_itemIndex_key" ON "HomeworkCompletion"("userId", "seasonNumber", "episodeNumber", "itemIndex");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkCompletion_clientId_seasonNumber_episodeNumber_itemIndex_key" ON "HomeworkCompletion"("clientId", "seasonNumber", "episodeNumber", "itemIndex");
