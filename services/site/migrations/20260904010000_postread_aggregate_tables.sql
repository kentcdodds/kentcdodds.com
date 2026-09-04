-- Widen: PostRead lookup indexes + small aggregate tables so request-path
-- analytics no longer GROUP BY / COUNT(DISTINCT) the ~1M-row PostRead table.
-- Backfill is a one-time scan; runtime reads hit these tables instead.

CREATE INDEX IF NOT EXISTS "PostRead_userId_createdAt_idx"
	ON "PostRead"("userId", "createdAt");

CREATE TABLE "PostReadSlugCount" (
	"postSlug" TEXT NOT NULL PRIMARY KEY,
	"count" INTEGER NOT NULL
);

INSERT INTO "PostReadSlugCount" ("postSlug", "count")
SELECT "postSlug", COUNT(*) FROM "PostRead" GROUP BY "postSlug";

CREATE TABLE "PostReadReader" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"kind" TEXT NOT NULL
);

INSERT OR IGNORE INTO "PostReadReader" ("id", "kind")
SELECT 'u:' || "userId", 'user'
FROM "PostRead"
WHERE "userId" IS NOT NULL
GROUP BY "userId";

INSERT OR IGNORE INTO "PostReadReader" ("id", "kind")
SELECT 'c:' || "clientId", 'client'
FROM "PostRead"
WHERE "clientId" IS NOT NULL
GROUP BY "clientId";
