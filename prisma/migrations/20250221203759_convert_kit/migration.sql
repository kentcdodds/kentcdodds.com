/*
  Warnings:

  - The column name 'convertKitId' on table 'User' would be renamed to 'kitId'

  NOTE: this was slightly modified by Cursor to be a "rename" rather than a "drop"

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
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
INSERT INTO "new_User" ("createdAt", "discordId", "email", "firstName", "id", "role", "team", "updatedAt", "kitId") 
SELECT "createdAt", "discordId", "email", "firstName", "id", "role", "team", "updatedAt", "convertKitId" 
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User.email_unique" ON "User"("email");
CREATE INDEX "User_team_idx" ON "User"("team");
PRAGMA foreign_key_check("User");
PRAGMA foreign_keys=ON;
