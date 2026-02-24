-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT,
    "codeHash" TEXT,
    "expiresAt" DATETIME NOT NULL
);
INSERT INTO "new_Verification" ("codeHash", "createdAt", "expiresAt", "id", "target", "type") SELECT "codeHash", "createdAt", "expiresAt", "id", "target", "type" FROM "Verification";
DROP TABLE "Verification";
ALTER TABLE "new_Verification" RENAME TO "Verification";
CREATE INDEX "Verification_target_type_idx" ON "Verification"("target", "type");
CREATE INDEX "Verification_expiresAt_idx" ON "Verification"("expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
