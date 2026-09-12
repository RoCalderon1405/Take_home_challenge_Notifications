-- AlterEnum
ALTER TYPE "notification_status" ADD VALUE 'DELIVERED';
ALTER TYPE "delivery_status" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "notifications"
ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "notification_deliveries"
ADD COLUMN "provider_message_id" VARCHAR(255),
ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

-- Historical rows store the provider identifier inside provider_response JSON.
-- Only copy values that already exist; never invent identifiers.
UPDATE "notification_deliveries"
SET "provider_message_id" = "provider_response"->>'providerMessageId'
WHERE "provider_message_id" IS NULL
  AND "provider_response" IS NOT NULL
  AND jsonb_typeof("provider_response") = 'object'
  AND COALESCE("provider_response"->>'providerMessageId', '') <> '';

-- CreateIndex
CREATE INDEX "idx_deliveries_provider_message_id"
ON "notification_deliveries"("provider", "provider_message_id");

-- CreateTable
CREATE TABLE "notification_delivery_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" UUID NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "provider_event_id" VARCHAR(255),
    "event_type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_delivery_event_provider_event"
ON "notification_delivery_events"("provider", "provider_event_id");

-- CreateIndex
CREATE INDEX "idx_delivery_events_delivery_id"
ON "notification_delivery_events"("delivery_id");

-- CreateIndex
CREATE INDEX "idx_delivery_events_occurred_at"
ON "notification_delivery_events"("occurred_at");

-- AddForeignKey
ALTER TABLE "notification_delivery_events"
ADD CONSTRAINT "fk_delivery_events_delivery"
FOREIGN KEY ("delivery_id") REFERENCES "notification_deliveries"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
