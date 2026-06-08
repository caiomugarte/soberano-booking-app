CREATE TABLE "neuromodulation_protocol_payments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "protocol_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "paid_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neuromodulation_protocol_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "neuromodulation_protocol_payments_protocol_id_paid_at_idx"
ON "neuromodulation_protocol_payments"("protocol_id", "paid_at");

CREATE INDEX "neuromodulation_protocol_payments_tenant_id_paid_at_idx"
ON "neuromodulation_protocol_payments"("tenant_id", "paid_at");

ALTER TABLE "neuromodulation_protocol_payments"
ADD CONSTRAINT "neuromodulation_protocol_payments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "neuromodulation_protocol_payments"
ADD CONSTRAINT "neuromodulation_protocol_payments_protocol_id_fkey"
FOREIGN KEY ("protocol_id") REFERENCES "neuromodulation_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "neuromodulation_protocol_payments" (
    "id",
    "tenant_id",
    "protocol_id",
    "amount_cents",
    "payment_method",
    "paid_at",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    "tenant_id",
    "id",
    "total_price_cents",
    COALESCE("payment_method", 'cash'),
    COALESCE("paid_at", "created_at"),
    COALESCE("paid_at", "created_at"),
    "updated_at"
FROM "neuromodulation_protocols"
WHERE "payment_status" = 'paid';

ALTER TABLE "neuromodulation_protocols"
DROP COLUMN "payment_status",
DROP COLUMN "payment_method",
DROP COLUMN "paid_at";
