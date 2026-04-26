# Feature: API Integration & Dev Setup

## Summary

Connect `web-marques` to the real `packages/api` backend, removing all hardcoded mock data. Configure the project for local development on port 5175 with the same environment variable structure as `packages/web`.

---

## Requirements

### [REQ-01] Dev server port
- `npm run dev` must start Vite on port **5175**
- Vite must proxy `/api` requests to `VITE_API_URL` (default `http://localhost:3000`)

### [REQ-02] Environment variables
- Add `.env` and `.env.example` with the same two variables as `packages/web`:
  ```
  VITE_API_URL=http://localhost:3000
  VITE_TENANT_SLUG=marques
  ```
- `.env` is gitignored; `.env.example` is committed

### [REQ-03] API client
- New file `src/config/api.js` — plain JS fetch wrapper mirroring `packages/web/src/config/api.ts`
- Must attach `X-Tenant-Slug: <VITE_TENANT_SLUG>` on every request
- New file `src/config/env.js` — reads `import.meta.env.VITE_TENANT_SLUG` and throws if missing

### [REQ-04] TanStack Query
- Add `@tanstack/react-query` dependency
- Wrap the app in `QueryClientProvider` inside `src/main.jsx`

### [REQ-05] Services — unmock StepService
- Remove hardcoded `services` array
- Fetch from `GET /api/services` → `{ services: Service[] }`
- API shape: `{ id, name, icon (emoji/string), priceCents (integer cents), duration (minutes), ... }`
- Display: format `priceCents` as `R$ XX,00`; format `duration` as human-readable (`40 min`, `1h 10min`)
- Show loading skeleton while fetching; show error message on failure

### [REQ-06] Barbers — unmock StepBarber
- Remove hardcoded `barbers` array
- Fetch from `GET /api/barbers` → `{ barbers: Barber[] }`
- API shape: `{ id, firstName, lastName, avatarUrl, workDays: number[], ... }`
- Display: `firstName + ' ' + lastName`; use `avatarUrl` for photo (fallback to placeholder if null)
- Pass full barber object (including `id` and `workDays`) up to parent via `onSelect`

### [REQ-07] Time slots — unmock StepTime
- Remove hardcoded `dates` and `times` arrays
- **Dates:** Generate the next 14 calendar days dynamically; filter by `barber.workDays` (array of integers, 0=Sun … 6=Sat); display at most 7 valid days
- **Times:** Fetch from `GET /api/slots?barberId=<id>&date=<YYYY-MM-DD>` → `{ slots: [{ time, available }] }`; only show slots where `available: true`
- Requires `barber` to be selected (passed as prop)
- Show loading state while fetching slots; show empty state if no slots available

### [REQ-08] Booking — replace WhatsApp with API call
- Remove `handleConfirm` WhatsApp redirect
- On confirm, call `POST /api/book` with:
  ```json
  {
    "serviceId": "<uuid>",
    "barberId": "<uuid>",
    "date": "YYYY-MM-DD",
    "startTime": "HH:mm",
    "customerName": "<string>",
    "customerPhone": "<digits only, 10-11 chars>"
  }
  ```
- Strip non-digit characters from `userPhone` before sending
- On success: advance to a step 6 "Agendamento Confirmado" view showing the booked details
- On error: show an inline error message with the API error text; remain on step 5

### [REQ-09] State shape alignment
- `selections.date` must become an object `{ label: string, iso: string }` where `iso` is `YYYY-MM-DD`
  - `label`: e.g. `"Segunda, 13 de Abril"`
  - `iso`: e.g. `"2026-04-13"` — used for API calls
- `selections.service` must carry `id` (UUID) from API
- `selections.barber` must carry `id` (UUID) and `workDays` from API

---

## Files Changed

| File | Change |
|------|--------|
| `vite.config.js` | Port 5175, `/api` proxy |
| `.env` | New — `VITE_API_URL` + `VITE_TENANT_SLUG` |
| `.env.example` | New — same vars with placeholder values |
| `package.json` | Add `@tanstack/react-query` |
| `src/main.jsx` | Wrap with `QueryClientProvider` |
| `src/config/env.js` | New — reads + validates env vars |
| `src/config/api.js` | New — fetch wrapper with tenant header |
| `src/components/StepService.jsx` | Replace mock with `useQuery` → `/api/services` |
| `src/components/StepBarber.jsx` | Replace mock with `useQuery` → `/api/barbers` |
| `src/components/StepTime.jsx` | Dynamic dates + `useQuery` → `/api/slots` |
| `src/App.jsx` | Replace WhatsApp confirm with `useMutation` → `POST /api/book`; add step 6 success view |

---

## Out of Scope

- The `server/` Express app (WhatsApp/Evolution API) — not touched
- TypeScript migration
- Admin dashboard (`src/admin/`) — not touched
- UI styling changes beyond what's needed to render API data
