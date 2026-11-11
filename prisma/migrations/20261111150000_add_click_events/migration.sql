-- CreateTable
CREATE TABLE "click_events" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "clicked_at" TIMESTAMPTZ(3) NOT NULL,
    "referrer_origin" VARCHAR(255),
    "user_agent" VARCHAR(512),

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "click_events_link_id_clicked_at_idx" ON "click_events"("link_id", "clicked_at");

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

