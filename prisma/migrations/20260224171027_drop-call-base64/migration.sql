-- Preflight: refuse to drop legacy DB base64 audio unless backfill is complete.
-- If any calls still have `base64` audio but no `audioKey`, dropping the column
-- would permanently remove their audio.
CREATE TEMP TABLE "__prisma_migrate_call_base64_backfill_guard" (
    ok INTEGER NOT NULL,
    CONSTRAINT "call_base64_backfill_required" CHECK (ok = 1)
);
INSERT INTO "__prisma_migrate_call_base64_backfill_guard" ("ok")
SELECT 0
WHERE EXISTS (
    SELECT 1 FROM "Call"
    WHERE "audioKey" IS NULL AND "base64" IS NOT NULL
);
DROP TABLE "__prisma_migrate_call_base64_backfill_guard";

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
    CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Call" ("audioContentType", "audioKey", "audioSize", "createdAt", "id", "isAnonymous", "notes", "title", "updatedAt", "userId") SELECT "audioContentType", "audioKey", "audioSize", "createdAt", "id", "isAnonymous", "notes", "title", "updatedAt", "userId" FROM "Call";
DROP TABLE "Call";
ALTER TABLE "new_Call" RENAME TO "Call";
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
