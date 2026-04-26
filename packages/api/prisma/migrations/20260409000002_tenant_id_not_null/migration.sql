-- AlterTable: make tenant_id NOT NULL on all tables
ALTER TABLE "barbers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "barber_shifts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "barber_absences" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "services" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "appointments" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AddForeignKey constraints
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "barber_shifts" ADD CONSTRAINT "barber_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "barber_absences" ADD CONSTRAINT "barber_absences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropIndex: old global unique constraints (will be replaced by per-tenant ones)
DROP INDEX IF EXISTS "barbers_slug_key";
DROP INDEX IF EXISTS "barbers_email_key";
DROP INDEX IF EXISTS "services_slug_key";
DROP INDEX IF EXISTS "customers_phone_key";

-- CreateIndex: per-tenant unique constraints
CREATE UNIQUE INDEX "barbers_tenant_id_slug_key" ON "barbers"("tenant_id", "slug");
CREATE UNIQUE INDEX "barbers_tenant_id_email_key" ON "barbers"("tenant_id", "email");
CREATE UNIQUE INDEX "services_tenant_id_slug_key" ON "services"("tenant_id", "slug");
CREATE UNIQUE INDEX "customers_tenant_id_phone_key" ON "customers"("tenant_id", "phone");

-- CreateIndex: performance indexes
CREATE INDEX "appointments_tenant_id_date_idx" ON "appointments"("tenant_id", "date");
CREATE INDEX "barbers_tenant_id_idx" ON "barbers"("tenant_id");
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");
