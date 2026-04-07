-- CreateTable
CREATE TABLE "PodcastEpisodeListen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    CONSTRAINT "PodcastEpisodeListen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PodcastEpisodeListen_userId_seasonNumber_episodeNumber_idx" ON "PodcastEpisodeListen"("userId", "seasonNumber", "episodeNumber");

-- CreateIndex
CREATE INDEX "PodcastEpisodeListen_seasonNumber_episodeNumber_createdAt_idx" ON "PodcastEpisodeListen"("seasonNumber", "episodeNumber", "createdAt");

-- CreateIndex
CREATE INDEX "PodcastEpisodeListen_createdAt_userId_idx" ON "PodcastEpisodeListen"("createdAt", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PodcastEpisodeListen_userId_seasonNumber_episodeNumber_key" ON "PodcastEpisodeListen"("userId", "seasonNumber", "episodeNumber");
