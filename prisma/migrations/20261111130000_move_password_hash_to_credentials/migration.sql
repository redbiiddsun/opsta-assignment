-- Moves password hashes from users (users module) into credentials (auth module).
-- Order matters: copy the existing hashes before the column is dropped.
-- Rollback: add users.password_hash back, copy it from credentials, drop credentials.

-- CreateTable
CREATE TABLE "credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("user_id")
);

-- CopyData
INSERT INTO "credentials" ("user_id", "password_hash")
SELECT "id", "password_hash" FROM "users";

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash";
