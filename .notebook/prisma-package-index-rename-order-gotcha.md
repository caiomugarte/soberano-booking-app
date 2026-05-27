# Prisma Package Index Rename Order Gotcha
> Migration history can become invalid when Prisma generates a rename for a
> provider-scoped package index before the migration that creates that index.

Entry: `packages/api/prisma/migrations/20260527142802_new_package/migration.sql`, `packages/api/prisma/migrations/20260527173000_add_customer_package_provider_ownership/migration.sql`, `packages/api/prisma/schema.prisma` (L281)

What happened:
- `20260527173000_add_customer_package_provider_ownership` creates the package
  index on `("tenant_id", "provider_id", "customer_phone", "status")`
- PostgreSQL truncates identifiers longer than 63 chars, so the generated index
  name is not stable if Prisma relies on the default auto-name
- Prisma later generated `20260527142802_new_package` as a rename-only
  migration, but its timestamp sorts before the migration that adds
  `provider_id`, so fresh or production deploys fail before later migrations can
  run

Safe fix:
- Keep the earlier rename-only migration as a no-op
- Create the final short index name directly in
  `20260527173000_add_customer_package_provider_ownership`
- Pin the Prisma schema index with
  `map: "customer_packages_tenant_id_provider_id_customer_phone_stat_idx"` so
  Prisma does not generate the rename again

Operational recovery:
- A failed deploy records `P3009` until the failed migration is resolved in
  `_prisma_migrations`
- Because the bad migration only attempted `ALTER INDEX ... RENAME`, failure is
  atomic and does not partially change the schema
- Recovery path is: update the repo, mark the failed migration rolled back with
  `prisma migrate resolve --rolled-back 20260527142802_new_package`, then rerun
  deploy so Prisma can reapply the corrected history

Updated: 2026-05-27
