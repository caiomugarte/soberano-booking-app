# web-bruno Patient Care Model Hotspots

**Tags:** psychology, web-bruno, api, patients, appointments, taxonomy, flow
**Discovered:** 2026-05-18

## Entry Points

- `packages/api/src/http/routes/psychology.routes.ts`
- `packages/api/src/http/routes/service.routes.ts`
- `packages/api/src/infrastructure/database/seed-bruno.ts`
- `packages/web-bruno/src/components/patients/PatientForm.tsx`
- `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
- `packages/web-bruno/src/schemas/appointment.schema.ts`
- `packages/web-bruno/src/config/constants.ts`
- `packages/web-bruno/src/api/financial.ts`

## Findings

1. Patient profile capture is currently split across two entry points:
   - the dedicated patient modal in `packages/web-bruno/src/components/patients/PatientForm.tsx`
   - the inline "Novo Paciente" step inside `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`
2. The inline appointment flow only creates `name`, `phone`, and `email`, so it would bypass any future requirement that every patient record include care-mode-aware profile fields unless it is upgraded or replaced.
3. The Bruno scheduling taxonomy is hardcoded end to end today:
   - API validation uses `individual|couple|family` in `packages/api/src/http/routes/psychology.routes.ts`
   - the Bruno seed creates the same three service slugs in `packages/api/src/infrastructure/database/seed-bruno.ts`
   - frontend enums/labels live in `packages/web-bruno/src/schemas/appointment.schema.ts` and `packages/web-bruno/src/config/constants.ts`
   - financial mapping still falls back to `individual` in `packages/web-bruno/src/api/financial.ts`
4. Session value defaults currently come from the selected service in `packages/web-bruno/src/components/appointments/AppointmentForm.tsx`, and the create/edit routes still fall back to `service.priceCents` in `packages/api/src/http/routes/psychology.routes.ts`.
5. Care-mode validation now lives in application-layer use cases instead of the Fastify route:
   - `packages/api/src/application/use-cases/patient/create-patient.ts`
   - `packages/api/src/application/use-cases/patient/update-patient.ts`
   The route still owns request parsing, duplicate checks, and normalization, but psychotherapy agreement rules and neuromodulation clearing happen in the use cases.
6. The Bruno dashboard birthday reminder is client-side and intentionally reuses the patient list query:
   - `packages/web-bruno/src/api/patients.ts` exposes `useTodayBirthdays()`
   - `packages/web-bruno/src/pages/DashboardPage.tsx` renders `components/dashboard/BirthdayReminder.tsx`
   Missing `birthDate` values are ignored, and dismissal lasts only for the current page visit.

## Gotchas

- Historical appointment pricing is already snapshot-based through `appointments.price_cents`, so patient-agreement changes should affect defaulting logic only, not rewrite old rows.
- Birthday reminders can reuse patient data once `birthDate` is added; no dedicated dashboard endpoint is strictly required if the existing patient query remains acceptable for Bruno's scale.
- `UpdatePsychologySessionUseCase` must preserve `appointment.priceCents` when callers omit `valueCents`; otherwise editing an old psychotherapy session can silently pick up the patient's newer negotiated price.
