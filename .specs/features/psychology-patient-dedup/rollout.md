# Psychology Patient Dedupe — Rollout Notes

## Duplicate CPF Audit

Run this query in each target environment before applying the CPF unique migration:

```sql
SELECT tenant_id, cpf, COUNT(*) AS duplicate_count
FROM customers
WHERE cpf IS NOT NULL
  AND btrim(cpf) <> ''
GROUP BY tenant_id, cpf
HAVING COUNT(*) > 1
ORDER BY tenant_id, cpf;
```

If this returns rows, clean up the duplicate non-null CPFs per tenant before running the migration. Null or blank CPFs can continue to coexist.

## Duplicate Email Audit

Run this query before applying the email unique migration:

```sql
SELECT tenant_id, lower(btrim(email)) AS normalized_email, COUNT(*) AS duplicate_count
FROM customers
WHERE email IS NOT NULL
  AND btrim(email) <> ''
GROUP BY tenant_id, lower(btrim(email))
HAVING COUNT(*) > 1
ORDER BY tenant_id, normalized_email;
```

If this returns rows, clean up the duplicate non-empty emails per tenant before running the email migration. Blank or null emails can continue to coexist.

## Local Session Note

- `psql` is not installed in this workspace session.
- `npx prisma db execute` was attempted from `packages/api`, but the local Postgres at `localhost:5432` was not reachable here, so the audit query still needs to be executed in the actual rollout environment.
