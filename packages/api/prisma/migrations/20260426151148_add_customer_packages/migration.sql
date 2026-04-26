-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "package_id" UUID;

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_phone" VARCHAR(20),
    "total_uses" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "total_price_cents" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_packages_tenant_id_customer_phone_status_idx" ON "customer_packages"("tenant_id", "customer_phone", "status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "customer_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
