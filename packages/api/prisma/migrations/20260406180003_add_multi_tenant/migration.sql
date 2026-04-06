/*
  Warnings:

  - A unique constraint covering the columns `[client_id,slug]` on the table `barbers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[client_id,email]` on the table `barbers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[client_id,phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[client_id,slug]` on the table `services` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "barbers_email_key";

-- DropIndex
DROP INDEX "barbers_slug_key";

-- DropIndex
DROP INDEX "customers_phone_key";

-- DropIndex
DROP INDEX "services_slug_key";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "client_id" UUID;

-- AlterTable
ALTER TABLE "barbers" ADD COLUMN     "client_id" UUID;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "client_id" UUID;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "client_id" UUID;

-- CreateTable
CREATE TABLE "super_admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "custom_domain" VARCHAR(255),
    "enabled_features" TEXT[],
    "theme" JSONB NOT NULL DEFAULT '{}',
    "base_url" VARCHAR(500) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "chatwoot_base_url" VARCHAR(500),
    "chatwoot_token" VARCHAR(255),
    "chatwoot_account_id" INTEGER,
    "chatwoot_inbox_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_slug_key" ON "clients"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clients_custom_domain_key" ON "clients"("custom_domain");

-- CreateIndex
CREATE INDEX "appointments_client_id_date_idx" ON "appointments"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_client_id_slug_key" ON "barbers"("client_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "barbers_client_id_email_key" ON "barbers"("client_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_client_id_phone_key" ON "customers"("client_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "services_client_id_slug_key" ON "services"("client_id", "slug");

-- AddForeignKey
ALTER TABLE "barbers" ADD CONSTRAINT "barbers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
