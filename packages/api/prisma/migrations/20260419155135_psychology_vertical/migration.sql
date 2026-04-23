-- DropIndex
DROP INDEX "appointments_tenant_id_date_idx";

-- DropIndex
DROP INDEX "customers_tenant_id_idx";

-- DropIndex
DROP INDEX "providers_tenant_id_idx";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "appointment_notes" TEXT,
ADD COLUMN     "paid_at" TIMESTAMPTZ,
ADD COLUMN     "payment_status" VARCHAR(20) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "cpf" VARCHAR(14),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "provider_absences" RENAME CONSTRAINT "barber_absences_pkey" TO "provider_absences_pkey";

-- AlterTable
ALTER TABLE "provider_shifts" RENAME CONSTRAINT "barber_shifts_pkey" TO "provider_shifts_pkey";

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "session_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "file_name" VARCHAR(255),
    "file_type" VARCHAR(100),
    "file_data" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_reports_appointment_id_idx" ON "session_reports"("appointment_id");

-- CreateIndex
CREATE INDEX "documents_customer_id_idx" ON "documents"("customer_id");

-- AddForeignKey
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "appointments_barber_id_date_start_time_idx" RENAME TO "appointments_provider_id_date_start_time_idx";

-- RenameIndex
ALTER INDEX "appointments_date_barber_id_idx" RENAME TO "appointments_date_provider_id_idx";
