# Super-Admin Frontend Redesign

## Overview

Replace the current minimal gray/white super-admin UI (`packages/web-admin`) with a polished, dark-themed admin panel aligned with the Altion/Soberano brand identity. The existing backend API (`/api/platform/*`) stays unchanged — this is a pure frontend overhaul.

---

## Design System

The Tailwind theme already defines the token set to use. No new colors introduced.

| Token | Value | Usage |
|---|---|---|
| `dark.DEFAULT` | `#0C0C0C` | Page background |
| `dark.surface` | `#161616` | Card/panel background |
| `dark.surface2` | `#1E1E1E` | Sidebar, secondary surfaces |
| `dark.border` | `#2A2A2A` | All borders and dividers |
| `gold.DEFAULT` | `#C9A96E` | Primary actions, active states, accents |
| `gold.light` | `#E8C98A` | Hover states on gold elements |
| `muted` | `#7A7672` | Secondary text, placeholders |
| white | `#FFFFFF` | Primary text on dark backgrounds |

**Typography:**
- Display/headings: `font-serif` (Playfair Display)
- Body/UI: `font-sans` (Inter)

**Motion:** Use existing `animate-fadeUp` for page transitions and modal entrances.

---

## Requirements

### SA-01 — App Shell / Layout

**ID:** SA-01  
**Priority:** P0 (blocker for all other pages)

A persistent layout wraps all authenticated pages. Unauthenticated pages (login) render without it.

**Sidebar (left, fixed, 240px wide):**
- Logo/brand mark at top: "Soberano" in `font-serif text-gold` + small subtitle "Platform Admin" in `text-muted text-xs`
- Nav items (vertical list):
  - Tenants (icon: building/store)
- Bottom section:
  - Logged-in indicator: shows "Super Admin" label
  - Logout button (text link style, muted color → red on hover)
- Background: `dark.surface2`
- Border-right: `dark.border`

**Main area (right of sidebar):**
- Background: `dark.DEFAULT`
- Top bar (64px tall): breadcrumb on left, action slot on right
- Content area: padded `px-8 py-6`

**Acceptance criteria:**
- [ ] Sidebar renders on all protected routes
- [ ] Active nav item highlighted with `text-gold` + left border `border-gold`
- [ ] Logout clears `platform_token` from localStorage and redirects to `/login`
- [ ] Layout is not rendered on `/login`

---

### SA-02 — Login Page

**ID:** SA-02  
**Priority:** P0

**Visual:**
- Full-screen centered layout, background `dark.DEFAULT`
- Card: `dark.surface`, rounded-2xl, subtle border `dark.border`, shadow
- Logo/title at top of card: "Soberano" in `font-serif` gold, subtitle "Platform Admin"
- Email and password inputs: dark background (`dark.surface2`), `text-white`, gold focus ring
- Submit button: full-width, gold background, dark text, `font-medium`
- Error state: red text below form

**Acceptance criteria:**
- [ ] Successful login → redirect to `/`
- [ ] Invalid credentials → error message displayed inline
- [ ] Loading state on submit button ("Entrando...")
- [ ] Form is keyboard-navigable (Tab order, Enter submits)

---

### SA-03 — Tenant List Page

**ID:** SA-03  
**Priority:** P0

**Page title:** "Tenants" in `font-serif text-2xl text-white`

**Action bar (top right):** "Novo Tenant" button — gold variant, with `+` icon

**Table (replaces current raw HTML table):**
- Container: `dark.surface` background, `rounded-xl`, border `dark.border`
- Header row: `dark.surface2`, text `muted`, uppercase, `text-xs tracking-widest`
- Columns: Slug (monospace), Name, Type, Status, Actions
- Row hover: subtle `dark.surface2` background highlight
- Status badge:
  - Active: gold outline badge (`border-gold/40 text-gold bg-gold/10`)
  - Inactive: muted badge (`border-dark.border text-muted bg-dark.surface2`)
- Actions column: "Editar" link → gold text, hover underline

**Empty state:**
- Centered card with descriptive text and "Criar primeiro tenant" CTA button

**Loading state:**
- Skeleton rows (3–4 animated pulse rows) instead of "Carregando..." text

**Acceptance criteria:**
- [ ] Table renders all tenants from `/api/platform/tenants`
- [ ] Status badge matches `isActive` field
- [ ] "Editar" navigates to `/tenants/:id`
- [ ] "Novo Tenant" navigates to `/tenants/new`
- [ ] Skeleton shows during fetch
- [ ] Empty state shows when tenant list is empty

---

### SA-04 — Tenant Form Page (Create & Edit)

**ID:** SA-04  
**Priority:** P0

**Layout:** Two-column on desktop (≥1024px), single column on mobile.
- Left column (2/3): Main fields card
- Right column (1/3): Config/integration card

**Main fields card** (`dark.surface`, `rounded-xl`, border `dark.border`):
- Card header: "Informações Gerais" with divider
- Fields: Slug (create only), Nome, Tipo
- Slug field: monospace input, disabled/grayed on edit with lock icon

**Configuration card** (`dark.surface`):
- Card header: "Configuração"
- Fields: Nome do negócio, Label do prestador, URL de agendamento

**Integrations card** (below config card, collapsed by default):
- Header: "Chatwoot" with expand/collapse toggle + "opcional" badge
- Fields: Base URL, API Token, Account ID, Inbox ID
- Collapsed state hides the form fields

**Active toggle:**
- Toggle switch component (not a raw checkbox) with label "Tenant Ativo"
- Green when active, muted when inactive

**Form inputs (all):**
- Background: `dark.surface2`
- Border: `dark.border`, focus: `ring-gold`
- Text: `text-white`
- Label: `text-muted text-sm font-medium`

**Action buttons (bottom of form):**
- "Salvar" — gold primary button
- "Cancelar" — ghost/outline button with muted color

**Breadcrumb in top bar:** Tenants > [Nome do tenant | "Novo Tenant"]

**Acceptance criteria:**
- [ ] Create mode: slug field is editable; submits POST `/api/platform/tenants`
- [ ] Edit mode: slug field is read-only; submits PATCH `/api/platform/tenants/:id`
- [ ] Chatwoot section collapsed by default, expands on click
- [ ] Toggle switch reflects `isActive`, persists on save
- [ ] Validation errors shown inline under affected fields
- [ ] On save success → navigate to `/` with query cache invalidated
- [ ] "Cancelar" navigates back to `/`
- [ ] Two-column layout on ≥1024px, stacked on mobile

---

### SA-05 — Shared UI Components

**ID:** SA-05  
**Priority:** P0 (required by SA-02 through SA-04)

New reusable components to be created under `packages/web-admin/src/components/`:

| Component | Description |
|---|---|
| `Button` | Variants: `primary` (gold), `outline` (muted border), `ghost` (text only). Sizes: `sm`, `md`. |
| `Input` | Dark-themed text input with label slot, error slot, optional prefix icon |
| `Card` | `dark.surface` container with optional header, body padding, border |
| `Badge` | Status badge with variants: `active`, `inactive`, `default` |
| `Skeleton` | Animated pulse block for loading states |
| `Toggle` | Accessible switch input replacing raw checkbox for boolean fields |
| `Sidebar` | Layout sidebar with nav item support |
| `PageHeader` | Top bar with breadcrumb + action slot |

No external UI library. Pure Tailwind + React.

---

## Out of Scope (this feature)

- New backend API endpoints
- Dashboard/analytics page (deferred)
- Dark/light mode toggle
- Tenant deletion
- Pagination or search on tenant list (can be added later when tenant count grows)
- Per-tenant detail pages (providers, services, appointments)

---

## File Changes

| Action | Path |
|---|---|
| New | `packages/web-admin/src/components/Button.tsx` |
| New | `packages/web-admin/src/components/Input.tsx` |
| New | `packages/web-admin/src/components/Card.tsx` |
| New | `packages/web-admin/src/components/Badge.tsx` |
| New | `packages/web-admin/src/components/Skeleton.tsx` |
| New | `packages/web-admin/src/components/Toggle.tsx` |
| New | `packages/web-admin/src/components/Sidebar.tsx` |
| New | `packages/web-admin/src/components/PageHeader.tsx` |
| New | `packages/web-admin/src/components/AppShell.tsx` |
| Rewrite | `packages/web-admin/src/pages/LoginPage.tsx` |
| Rewrite | `packages/web-admin/src/pages/TenantListPage.tsx` |
| Rewrite | `packages/web-admin/src/pages/TenantFormPage.tsx` |
| Edit | `packages/web-admin/src/App.tsx` (wrap protected routes in AppShell) |
| Edit | `packages/web-admin/index.html` (add Google Fonts: Inter + Playfair Display) |
