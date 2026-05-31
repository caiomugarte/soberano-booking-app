# web-bruno Patient Care Model — Rollout Notes

## Backfill rule

- Existing Bruno patients are backfilled to `careMode = psychotherapy` by default.
- Psychotherapy-only agreement fields stay nullable at the database level.
- If a patient is known to belong to neuromodulation, switch that record manually after the migration or through the updated patient form.

## Legacy service normalization

- Collapse Bruno legacy psychology slugs `individual`, `couple`, `family`, `casal`, and `familiar` into the supported `psychotherapy` service.
- Repoint historical `appointments.service_id` and `recurring_appointment_series.service_id` rows to the kept psychotherapy service row.
- Keep or recycle one Bruno service row as `neuromodulation`.
- Deactivate extra Bruno service rows after the two supported taxonomy rows exist.

## Historical pricing rule

- Historical appointment values remain in `appointments.price_cents`.
- Patient agreement changes affect only new default values for future psychotherapy sessions.

## Suggested audit queries

Run these against the Bruno tenant before and after applying the migration:

```sql
-- Legacy Bruno service inventory
SELECT slug, is_active, COUNT(*) AS rows
FROM services
WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'bruno'
)
GROUP BY slug, is_active
ORDER BY slug, is_active;

-- Historical appointments still tied to legacy psychology slugs
SELECT s.slug, COUNT(*) AS appointments
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.tenant_id = (
  SELECT id FROM tenants WHERE slug = 'bruno'
)
GROUP BY s.slug
ORDER BY appointments DESC;

-- Patients missing the new profile fields after rollout
SELECT
  care_mode,
  COUNT(*) FILTER (WHERE birth_date IS NULL) AS missing_birth_date,
  COUNT(*) FILTER (WHERE address IS NULL OR btrim(address) = '') AS missing_address,
  COUNT(*) FILTER (
    WHERE care_mode = 'psychotherapy'
      AND psychotherapy_price_cents IS NULL
  ) AS missing_psychotherapy_price,
  COUNT(*) FILTER (
    WHERE care_mode = 'psychotherapy'
      AND psychotherapy_frequency IS NULL
  ) AS missing_psychotherapy_frequency
FROM customers
WHERE tenant_id = (
  SELECT id FROM tenants WHERE slug = 'bruno'
)
GROUP BY care_mode
ORDER BY care_mode;
```

## Remaining manual step

- Review which backfilled patients should actually move to `careMode = neuromodulation`; the migration intentionally defaults everyone to `psychotherapy` because legacy data does not contain a reliable mode flag.
