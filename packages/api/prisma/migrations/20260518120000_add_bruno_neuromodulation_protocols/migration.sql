ALTER TABLE "customers"
ADD COLUMN "care_mode" VARCHAR(30);

UPDATE "customers"
SET "care_mode" = 'psychotherapy'
WHERE "care_mode" IS NULL;

ALTER TABLE "customers"
ALTER COLUMN "care_mode" SET NOT NULL,
ALTER COLUMN "care_mode" SET DEFAULT 'psychotherapy';

ALTER TABLE "customers"
ADD COLUMN "psychotherapy_price_cents" INTEGER,
ADD COLUMN "psychotherapy_frequency" VARCHAR(20),
ADD COLUMN "birth_date" DATE,
ADD COLUMN "address" TEXT;

CREATE TABLE "neuromodulation_protocols" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "total_price_cents" INTEGER NOT NULL,
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "payment_method" VARCHAR(20),
    "paid_at" TIMESTAMPTZ,
    "manual_consumed_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neuromodulation_protocols_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments"
ADD COLUMN "protocol_id" UUID,
ADD COLUMN "protocol_credit_outcome" VARCHAR(20);

CREATE INDEX "appointments_protocol_id_idx" ON "appointments"("protocol_id");
CREATE INDEX "neuromodulation_protocols_tenant_id_customer_id_status_idx" ON "neuromodulation_protocols"("tenant_id", "customer_id", "status");
CREATE INDEX "neuromodulation_protocols_provider_id_status_idx" ON "neuromodulation_protocols"("provider_id", "status");

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_protocol_id_fkey"
FOREIGN KEY ("protocol_id") REFERENCES "neuromodulation_protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "neuromodulation_protocols"
ADD CONSTRAINT "neuromodulation_protocols_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "neuromodulation_protocols"
ADD CONSTRAINT "neuromodulation_protocols_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "neuromodulation_protocols"
ADD CONSTRAINT "neuromodulation_protocols_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE
    bruno_tenant_id UUID;
    psychotherapy_service_id UUID;
    neuromodulation_service_id UUID;
    recycled_service_id UUID;
BEGIN
    SELECT "id"
    INTO bruno_tenant_id
    FROM "tenants"
    WHERE "slug" = 'bruno'
    LIMIT 1;

    IF bruno_tenant_id IS NULL THEN
        RETURN;
    END IF;

    SELECT "id"
    INTO psychotherapy_service_id
    FROM "services"
    WHERE "tenant_id" = bruno_tenant_id
      AND "slug" = 'psychotherapy'
    ORDER BY "sort_order" ASC, "created_at" ASC
    LIMIT 1;

    IF psychotherapy_service_id IS NULL THEN
        SELECT "id"
        INTO psychotherapy_service_id
        FROM "services"
        WHERE "tenant_id" = bruno_tenant_id
          AND "slug" IN ('individual', 'couple', 'family', 'casal', 'familiar')
        ORDER BY "sort_order" ASC, "created_at" ASC
        LIMIT 1;
    END IF;

    IF psychotherapy_service_id IS NOT NULL THEN
        UPDATE "services"
        SET
            "slug" = 'psychotherapy',
            "name" = 'Psicoterapia',
            "icon" = '🧠',
            "sort_order" = 1,
            "is_active" = TRUE
        WHERE "id" = psychotherapy_service_id;

        UPDATE "appointments"
        SET "service_id" = psychotherapy_service_id
        WHERE "tenant_id" = bruno_tenant_id
          AND "service_id" IN (
              SELECT "id"
              FROM "services"
              WHERE "tenant_id" = bruno_tenant_id
                AND "id" <> psychotherapy_service_id
                AND "slug" IN ('individual', 'couple', 'family', 'casal', 'familiar')
          );

        UPDATE "recurring_appointment_series"
        SET "service_id" = psychotherapy_service_id
        WHERE "tenant_id" = bruno_tenant_id
          AND "service_id" IN (
              SELECT "id"
              FROM "services"
              WHERE "tenant_id" = bruno_tenant_id
                AND "id" <> psychotherapy_service_id
                AND "slug" IN ('individual', 'couple', 'family', 'casal', 'familiar')
          );
    END IF;

    SELECT "id"
    INTO neuromodulation_service_id
    FROM "services"
    WHERE "tenant_id" = bruno_tenant_id
      AND "slug" = 'neuromodulation'
    ORDER BY "sort_order" ASC, "created_at" ASC
    LIMIT 1;

    IF neuromodulation_service_id IS NULL THEN
        SELECT "id"
        INTO recycled_service_id
        FROM "services"
        WHERE "tenant_id" = bruno_tenant_id
          AND (psychotherapy_service_id IS NULL OR "id" <> psychotherapy_service_id)
        ORDER BY "sort_order" ASC, "created_at" ASC
        LIMIT 1;

        neuromodulation_service_id := recycled_service_id;
    END IF;

    IF neuromodulation_service_id IS NOT NULL THEN
        UPDATE "services"
        SET
            "slug" = 'neuromodulation',
            "name" = 'Neuromodulação',
            "icon" = '⚡',
            "sort_order" = 2,
            "is_active" = TRUE
        WHERE "id" = neuromodulation_service_id;
    END IF;

    UPDATE "services"
    SET "is_active" = FALSE
    WHERE "tenant_id" = bruno_tenant_id
      AND (psychotherapy_service_id IS NULL OR "id" <> psychotherapy_service_id)
      AND (neuromodulation_service_id IS NULL OR "id" <> neuromodulation_service_id);
END $$;
