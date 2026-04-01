# Barber Photos – Tasks

## Summary

2 files to change. No new components. No API changes needed (avatarUrl is already returned).

---

## Task 1 — Populate `avatarUrl` in the DB

**File:** `packages/api/src/infrastructure/database/seed.ts`

**What:** Add `avatarUrl` to each barber entry in the `BARBERS` array and include it in the `upsert` update block so it's set on re-seed.

**Changes:**
- Add `avatarUrl` field to each barber object:
  - `matheus` → `/matheus-kemp.jpeg`
  - `adenilson` → `/adenilson.jpeg`
  - `vandson` → `/vandson.jpeg`
- Include `avatarUrl` in the `update` block of `prisma.barber.upsert`

**Verification (BPHOTO-04, BPHOTO-05):**
- Run seed: `pnpm --filter api db:seed`
- Query DB: all 3 barbers have `avatar_url` set to the correct path

---

## Task 2 — Render photo in `BarberStep.tsx`

**File:** `packages/web/src/components/booking/BarberStep.tsx`

**What:** Replace the hardcoded 💈 emoji `<div>` with conditional rendering: show `<img>` when `avatarUrl` is present, fall back to 💈 when null or on error.

**Changes:**
- Replace the emoji container (lines 34–36) with:
  ```tsx
  {b.avatarUrl ? (
    <img
      src={b.avatarUrl}
      alt={`${b.firstName} ${b.lastName}`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      className={`w-14 h-14 rounded-full object-cover mx-auto mb-3 border-2 transition-colors ${barber?.id === b.id ? 'border-gold' : 'border-dark-border'}`}
    />
  ) : (
    <div className={`w-14 h-14 rounded-full bg-dark-border flex items-center justify-center text-2xl mx-auto mb-3 border-2 transition-colors ${barber?.id === b.id ? 'border-gold' : 'border-dark-border'}`}>
      💈
    </div>
  )}
  ```

**Verification (BPHOTO-01, BPHOTO-02, BPHOTO-03):**
- Open booking → step 2 → all 3 cards show real photos
- Click a barber → gold border appears on the photo
- Temporarily set `avatarUrl` to null in a test → emoji fallback renders

---

## Execution Order

```
Task 1 (seed) → Task 2 (UI)
```

Task 1 must run first so the DB has the URLs before verifying the UI.
