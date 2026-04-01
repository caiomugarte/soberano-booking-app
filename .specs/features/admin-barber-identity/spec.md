# Admin Dashboard – Barber Identity in Appointment Cards

## Problem Statement

The admin dashboard's appointment cards show service, customer, time, and price — but no barber identity. Since the dashboard is shared across barbers (each barber logs in and sees their own data), the missing name/photo is a UX gap: there's no visual confirmation of *whose* appointments you're looking at, and appointment cards feel impersonal. The API already returns `barber.firstName`, `barber.lastName`, and `barber.avatarUrl` — it just isn't wired through to the UI.

## Goals

- [ ] Show the barber's photo and full name on every appointment card in the admin dashboard
- [ ] Gracefully fall back to initials when no `avatarUrl` is set

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editing barber profile from the dashboard | Separate admin feature |
| Showing barber identity in WeekView calendar blocks | Calendar blocks are too small; name is already implicit |
| Filtering appointments by barber | Each barber sees only their own appointments |

---

## User Stories

### P1: Display barber photo and name on appointment card ⭐ MVP

**User Story**: As a barber admin, I want to see my photo and name on each appointment card so that the dashboard clearly identifies who the appointments belong to.

**Why P1**: Single meaningful change — the whole spec is this one story.

**Acceptance Criteria**:

1. WHEN an appointment card renders and `barber.avatarUrl` is set THEN the card SHALL display a circular photo (32×32px) next to the barber's full name
2. WHEN an appointment card renders and `barber.avatarUrl` is `null` THEN the card SHALL display a circular fallback with the barber's initials (e.g. "MK") in place of the photo
3. WHEN the barber photo fails to load THEN the card SHALL swap to the initials fallback via `onError`
4. WHEN the `AdminAppointment` type is updated THEN it SHALL include `barber: { firstName: string; lastName: string; avatarUrl: string | null }`

**Independent Test**: Open admin dashboard → day view → any appointment card shows barber photo (or initials) + full name.

---

## Edge Cases

- WHEN `barber.avatarUrl` is `null` THEN initials fallback SHALL derive from `firstName[0] + lastName[0]` (e.g. "Matheus Kemp" → "MK")
- WHEN the image 404s THEN `onError` SHALL hide the `<img>` and show the initials fallback
- WHEN a barber has only one name THEN initials SHALL use `firstName[0]` only

---

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| ABI-01 | P1: Show barber photo (avatarUrl) on card | Pending |
| ABI-02 | P1: Show initials fallback when no avatarUrl | Pending |
| ABI-03 | P1: onError swap to initials fallback | Pending |
| ABI-04 | P1: Extend AdminAppointment type with barber field | Pending |

---

## Success Criteria

- [ ] Every appointment card in day view shows barber photo or initials + full name
- [ ] No broken image icons under any condition
- [ ] TypeScript compiles without errors after type change
