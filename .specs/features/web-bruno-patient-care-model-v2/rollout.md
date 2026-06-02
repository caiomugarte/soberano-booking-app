# Web Bruno Patient Care Model V2 Rollout Notes

## Migration

- Migration folder: `packages/api/prisma/migrations/20260602130000_web_bruno_patient_care_model_v2`
- `customers.care_mode` is replaced by:
  - `customers.neuromodulation_eligible`
  - `customers.parents_meeting_status`
- Existing rows are backfilled as follows:
  - `care_mode = 'neuromodulation'` → `neuromodulation_eligible = true`
  - every other existing row → `neuromodulation_eligible = false`
- Existing `psychotherapy_price_cents` and `psychotherapy_frequency` values are preserved as-is.
- Historical `appointments.price_cents` snapshots are untouched.

## Manual Review Query

Run this after deploy if Bruno wants to review edge-case patient rows:

```sql
SELECT
  id,
  name,
  psychotherapy_price_cents,
  psychotherapy_frequency,
  neuromodulation_eligible,
  parents_meeting_status
FROM customers
WHERE
  (psychotherapy_price_cents IS NULL) <> (psychotherapy_frequency IS NULL)
  OR neuromodulation_eligible = true
ORDER BY name;
```

Why:

- the first condition finds incomplete psychotherapy agreement data
- the second condition lists every neuromodulation-eligible patient so Bruno can confirm dual-track intent

## Deferred Product Decision

- This rollout implements the parents-meeting workflow as `pending` / `completed` status only.
- A dedicated parents-meeting date field is still deferred and should be specified separately if Bruno needs it.
