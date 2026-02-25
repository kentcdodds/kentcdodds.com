-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "discordId" TEXT,
    "kitId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "team" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "expirationDate" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Call" (
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
    CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallKentEpisodeDraft" (
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
    CONSTRAINT "CallKentCallerEpisode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "clientId" TEXT,
    "postSlug" TEXT NOT NULL,
    CONSTRAINT "PostRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aaguid" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publicKey" BLOB NOT NULL,
    "userId" TEXT NOT NULL,
    "webauthnUserId" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_team_idx" ON "User"("team");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE INDEX "Verification_target_type_idx" ON "Verification"("target", "type");

-- CreateIndex
CREATE INDEX "Verification_expiresAt_idx" ON "Verification"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_expirationDate_idx" ON "Session"("expirationDate");

-- CreateIndex
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallKentEpisodeDraft_callId_key" ON "CallKentEpisodeDraft"("callId");

-- CreateIndex
CREATE INDEX "CallKentEpisodeDraft_status_updatedAt_idx" ON "CallKentEpisodeDraft"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallKentCallerEpisode_transistorEpisodeId_key" ON "CallKentCallerEpisode"("transistorEpisodeId");

-- CreateIndex
CREATE INDEX "CallKentCallerEpisode_userId_createdAt_idx" ON "CallKentCallerEpisode"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PostRead_userId_postSlug_idx" ON "PostRead"("userId", "postSlug");

-- CreateIndex
CREATE INDEX "PostRead_clientId_postSlug_idx" ON "PostRead"("clientId", "postSlug");

-- CreateIndex
CREATE INDEX "PostRead_postSlug_createdAt_idx" ON "PostRead"("postSlug", "createdAt");

-- CreateIndex
CREATE INDEX "PostRead_createdAt_userId_idx" ON "PostRead"("createdAt", "userId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_contentType_contentId_idx" ON "Favorite"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_contentType_contentId_key" ON "Favorite"("userId", "contentType", "contentId");

-- Insert initial admin user for migration/runtime testing.
-- Password plaintext is "9e86f147c660108f4d9bc36aa15dd16d" (will be overridden during manual migration).
INSERT INTO "User" ("id", "updatedAt", "email", "firstName", "role", "team")
VALUES (
    '0f9b8476-2d45-4f23-a4eb-5fbb9c8a6b66',
    CURRENT_TIMESTAMP,
    'me@kentcdodds.com',
    'Kent',
    'ADMIN',
    'BLUE'
);

INSERT INTO "Password" ("hash", "updatedAt", "userId")
VALUES (
    'pbkdf2$sha256$310000$XGwwoJOLpF_7hNtyI4eJcg$3mT-V9UlnDSSnyo_COHu_Ql0-GShvtjk-75r-lfE7KM',
    CURRENT_TIMESTAMP,
    '0f9b8476-2d45-4f23-a4eb-5fbb9c8a6b66'
);
