CREATE TABLE "recurring_appointment_series" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "interval_weeks" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "stop_date" DATE,
    "price_cents" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_appointment_series_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments"
ADD COLUMN "recurring_series_id" UUID;

CREATE INDEX "appointments_recurring_series_id_idx"
ON "appointments"("recurring_series_id");

CREATE INDEX "recurring_appointment_series_provider_id_status_idx"
ON "recurring_appointment_series"("provider_id", "status");

CREATE INDEX "recurring_appointment_series_tenant_id_status_idx"
ON "recurring_appointment_series"("tenant_id", "status");

CREATE INDEX "recurring_appointment_series_customer_id_idx"
ON "recurring_appointment_series"("customer_id");

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_recurring_series_id_fkey"
FOREIGN KEY ("recurring_series_id") REFERENCES "recurring_appointment_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recurring_appointment_series"
ADD CONSTRAINT "recurring_appointment_series_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_appointment_series"
ADD CONSTRAINT "recurring_appointment_series_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_appointment_series"
ADD CONSTRAINT "recurring_appointment_series_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_appointment_series"
ADD CONSTRAINT "recurring_appointment_series_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
