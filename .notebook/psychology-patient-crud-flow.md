# Psychology Patient CRUD Flow

**Tags:** psychology, patients, web-bruno, api, flow
**Discovered:** 2026-05-04

## Entry Points

- `packages/api/src/http/routes/psychology.routes.ts` → `/api/psychology/patients`
- `packages/web-bruno/src/api/patients.ts`
- `packages/web-bruno/src/components/patients/PatientForm.tsx`

## Flow

1. `PatientForm` owns all modal field state locally and rehydrates from the selected patient whenever the modal opens.
2. The form submits through `useCreatePatient()` / `useUpdatePatient()` in `packages/web-bruno/src/api/patients.ts`; there is no direct `fetch` in the component.
3. `apiFetch()` in `packages/web-bruno/src/api/http-client.ts` throws an `ApiError` carrying the backend `message`, so the modal can render route-level duplicate messages without extra parsing.
4. The Fastify route instantiates `PrismaCustomerRepository(request.tenantPrisma)`, relying on tenant-aware Prisma injection instead of repeating explicit tenant filters in each repository call.
5. Patient duplicate protection is hybrid: the route pre-checks normalized `cpf` and normalized non-empty `email`, and Prisma unique constraints remain the final guard for `phone`, `cpf`, and `email`.
6. Patient deletion is initiated from `packages/web-bruno/src/pages/PatientDetailPage.tsx`, which now uses a custom confirmation modal and shows backend delete-blocker messages inline before attempting navigation back to `/pacientes`.
7. `PatientHistory` in `packages/web-bruno/src/components/patients/PatientHistory.tsx` now exposes the cleanup actions needed to unblock patient deletion: single-session delete for any visible session and recurring-series stop for upcoming active recurring sessions.
8. `DELETE /api/psychology/patients/:id` does not cascade. Before calling `customer.delete`, the route counts linked `documents`, `appointments`, and `recurringAppointmentSeries` rows and returns `409 PATIENT_HAS_DEPENDENCIES` with a human-readable summary when any related records still exist.
9. The delete route now auto-prunes recurring-series rows that have zero linked appointments before it decides whether deletion is blocked. This resolves the dead-end where `PatientHistory` showed `Nenhuma sessão registrada` but a stopped or manually drained recurrence still prevented deleting the patient.
10. Finished neuromodulation protocols are now deletable from `PatientProtocolsPanel`, but only when they have no linked appointments. That closes the prior dead-end where protocol-only blockers could not be cleared from the Bruno UI at all.

## Gotcha

- In this patient patch flow, `undefined` means "leave the field unchanged" while `null` means "clear the stored nullable value". That matters for optional fields like `email` and `cpf` when the edit modal submits blanks.
- Email is normalized with `trim().toLowerCase()` before duplicate checks and persistence, so `Foo@Bar.com` and ` foo@bar.com ` are treated as the same address.
- Patient deletion can fail even when the UI only surfaces "documents" or "pending sessions" as likely causes, because the database also restricts deletion when historical appointments or recurring-series rows still reference the patient.
- A recurring series with zero appointments is dead state, not actionable history. The delete route treats it as cleanup, not as a user-facing blocker.
