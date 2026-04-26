-- CreateTable: tenants
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'barbershop',
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: tenants_slug_key
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- AddColumn: nullable tenant_id to all tables
ALTER TABLE "barbers" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "barber_shifts" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "barber_absences" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "services" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customers" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "appointments" ADD COLUMN "tenant_id" UUID;

-- Seed: insert Soberano tenant and assign all existing rows
INSERT INTO tenants (id, slug, name, type, config, is_active, created_at)
VALUES (gen_random_uuid(), 'soberano', 'Soberano Barbearia', 'barbershop',
  '{"businessName":"Soberano Barbearia","providerLabel":"Barbeiro","bookingUrl":"https://soberano.altion.com.br"}',
  true, NOW());

UPDATE barbers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
UPDATE barber_shifts SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
UPDATE barber_absences SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
UPDATE services SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
UPDATE appointments SET tenant_id = (SELECT id FROM tenants WHERE slug = 'soberano');
