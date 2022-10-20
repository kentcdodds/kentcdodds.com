-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" DEFAULT E'MEMBER';

-- Manually written stuff:

-- Update all users to be members:
update "User" set role = E'MEMBER';

-- update me@kentcdodds.com to be ADMIN:
update "User" set role = E'ADMIN' where email = 'me@kentcdodds.com';

-- make role required
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
