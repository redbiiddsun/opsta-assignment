-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "short_code" VARCHAR(32) NOT NULL,
    "destination_url" VARCHAR(2048) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "links_short_code_key" ON "links"("short_code");

-- CreateIndex
CREATE INDEX "links_owner_id_created_at_idx" ON "links"("owner_id", "created_at");

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

