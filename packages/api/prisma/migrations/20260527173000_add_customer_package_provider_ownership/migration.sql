ALTER TABLE "customer_packages"
ADD COLUMN "provider_id" UUID;

UPDATE "customer_packages" AS cp
SET "provider_id" = first_booking."provider_id"
FROM (
  SELECT DISTINCT ON (a."package_id")
    a."package_id",
    a."provider_id"
  FROM "appointments" AS a
  WHERE a."package_id" IS NOT NULL
  ORDER BY a."package_id", a."date" ASC, a."start_time" ASC, a."created_at" ASC
) AS first_booking
WHERE cp."id" = first_booking."package_id"
  AND cp."provider_id" IS NULL;

UPDATE "customer_packages" AS cp
SET "provider_id" = single_provider."provider_id"
FROM (
  SELECT p."tenant_id", p."id" AS "provider_id"
  FROM "providers" AS p
  WHERE NOT EXISTS (
    SELECT 1
    FROM "providers" AS other
    WHERE other."tenant_id" = p."tenant_id"
      AND other."id" <> p."id"
  )
) AS single_provider
WHERE cp."tenant_id" = single_provider."tenant_id"
  AND cp."provider_id" IS NULL;

UPDATE "customer_packages" AS cp
SET "provider_id" = fallback_provider."provider_id"
FROM (
  SELECT DISTINCT ON (p."tenant_id")
    p."tenant_id",
    p."id" AS "provider_id"
  FROM "providers" AS p
  ORDER BY p."tenant_id", p."created_at" ASC, p."id" ASC
) AS fallback_provider
WHERE cp."tenant_id" = fallback_provider."tenant_id"
  AND cp."provider_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "customer_packages"
    WHERE "provider_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Unable to backfill provider ownership for one or more customer packages.';
  END IF;
END $$;

ALTER TABLE "customer_packages"
ALTER COLUMN "provider_id" SET NOT NULL;

ALTER TABLE "customer_packages"
ADD CONSTRAINT "customer_packages_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

DROP INDEX "customer_packages_tenant_id_customer_phone_status_idx";

CREATE INDEX "customer_packages_tenant_id_provider_id_customer_phone_status_idx"
ON "customer_packages"("tenant_id", "provider_id", "customer_phone", "status");

CREATE INDEX "customer_packages_tenant_id_provider_id_status_idx"
ON "customer_packages"("tenant_id", "provider_id", "status");
