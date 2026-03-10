-- DropIndex
DROP INDEX "PostRead_clientId_idx";

-- DropIndex
DROP INDEX "PostRead_userId_idx";

-- CreateIndex
CREATE INDEX "PostRead_userId_postSlug_idx" ON "PostRead"("userId", "postSlug");

-- CreateIndex
CREATE INDEX "PostRead_clientId_postSlug_idx" ON "PostRead"("clientId", "postSlug");

-- CreateIndex
CREATE INDEX "PostRead_postSlug_createdAt_idx" ON "PostRead"("postSlug", "createdAt");

-- CreateIndex
CREATE INDEX "PostRead_createdAt_userId_idx" ON "PostRead"("createdAt", "userId");

-- CreateIndex
CREATE INDEX "User_team_idx" ON "User"("team");
