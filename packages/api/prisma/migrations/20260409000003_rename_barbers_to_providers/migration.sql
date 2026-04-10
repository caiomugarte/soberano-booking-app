-- RenameTable: barbers → providers
ALTER TABLE "barbers" RENAME TO "providers";
ALTER TABLE "barber_shifts" RENAME TO "provider_shifts";
ALTER TABLE "barber_absences" RENAME TO "provider_absences";

-- RenameColumn: barber_id → provider_id
ALTER TABLE "provider_shifts" RENAME COLUMN "barber_id" TO "provider_id";
ALTER TABLE "provider_absences" RENAME COLUMN "barber_id" TO "provider_id";
ALTER TABLE "appointments" RENAME COLUMN "barber_id" TO "provider_id";

-- Rename primary key constraints
ALTER TABLE "providers" RENAME CONSTRAINT "barbers_pkey" TO "providers_pkey";

-- Rename indexes
ALTER INDEX IF EXISTS "barbers_tenant_id_slug_key" RENAME TO "providers_tenant_id_slug_key";
ALTER INDEX IF EXISTS "barbers_tenant_id_email_key" RENAME TO "providers_tenant_id_email_key";
ALTER INDEX IF EXISTS "barbers_tenant_id_idx" RENAME TO "providers_tenant_id_idx";

-- Rename foreign key constraints
ALTER TABLE "providers" RENAME CONSTRAINT "barbers_tenant_id_fkey" TO "providers_tenant_id_fkey";
ALTER TABLE "provider_shifts" RENAME CONSTRAINT "barber_shifts_tenant_id_fkey" TO "provider_shifts_tenant_id_fkey";
ALTER TABLE "provider_absences" RENAME CONSTRAINT "barber_absences_tenant_id_fkey" TO "provider_absences_tenant_id_fkey";

-- Update appointment provider_id foreign key (was barber_id)
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_barber_id_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update provider_shifts provider_id foreign key
ALTER TABLE "provider_shifts" DROP CONSTRAINT IF EXISTS "barber_shifts_barber_id_fkey";
ALTER TABLE "provider_shifts" ADD CONSTRAINT "provider_shifts_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update provider_absences provider_id foreign key
ALTER TABLE "provider_absences" DROP CONSTRAINT IF EXISTS "barber_absences_barber_id_fkey";
ALTER TABLE "provider_absences" ADD CONSTRAINT "provider_absences_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing indexes that reference old column names
DROP INDEX IF EXISTS "barber_absences_barberId_date_idx";
CREATE INDEX "provider_absences_providerId_date_idx" ON "provider_absences"("provider_id", "date");
