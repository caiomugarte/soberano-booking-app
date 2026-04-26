# Tasks — Super-Admin Frontend Redesign

## T1 — Add Google Fonts to index.html
**Spec:** SA-02, SA-03, SA-04  
**File:** `packages/web-admin/index.html`  
**Steps:**
1. Add `<link>` preconnect + stylesheet for Inter and Playfair Display from Google Fonts
**Verify:** Fonts load in browser (check DevTools Network)

---

## T2 — Build shared UI components
**Spec:** SA-05  
**Files:** `packages/web-admin/src/components/*.tsx`  
**Dependencies:** T1  
**Steps:**
1. Create `Button.tsx` — variants: `primary`, `outline`, `ghost`; sizes: `sm`, `md`
2. Create `Input.tsx` — dark-themed, label + error slots, optional left icon
3. Create `Card.tsx` — `dark.surface` container, optional title header with divider
4. Create `Badge.tsx` — variants: `active`, `inactive`
5. Create `Skeleton.tsx` — animated pulse block, configurable height/width
6. Create `Toggle.tsx` — accessible checkbox-based switch
7. Create `Sidebar.tsx` — left nav with logo, nav items, logout at bottom
8. Create `PageHeader.tsx` — top bar with breadcrumb prop + children (action slot)
9. Create `AppShell.tsx` — composes Sidebar + PageHeader + main content area
**Verify:** Each component renders without errors (no visual regression test required, spot-check in browser)

---

## T3 — Rewrite LoginPage
**Spec:** SA-02  
**File:** `packages/web-admin/src/pages/LoginPage.tsx`  
**Dependencies:** T2  
**Steps:**
1. Replace gray/white layout with dark full-screen centered layout
2. Card uses `dark.surface`, gold logo/title, dark inputs with gold focus ring
3. Submit button uses `Button primary`
4. Wire error display and loading state (no logic changes)
**Verify:** Can log in successfully; error shows on wrong credentials

---

## T4 — Rewrite TenantListPage
**Spec:** SA-03  
**File:** `packages/web-admin/src/pages/TenantListPage.tsx`  
**Dependencies:** T2  
**Steps:**
1. Replace layout wrapper with AppShell (breadcrumb: "Tenants", action: "Novo Tenant" button)
2. Replace raw table with dark-themed table inside a `Card`
3. Add `Badge` component for status column
4. Add `Skeleton` loading state (3 rows)
5. Add empty state card with CTA
**Verify:** List renders tenants; status badge correct; skeleton shows during load; empty state shows when empty

---

## T5 — Rewrite TenantFormPage
**Spec:** SA-04  
**File:** `packages/web-admin/src/pages/TenantFormPage.tsx`  
**Dependencies:** T2  
**Steps:**
1. Replace layout with AppShell (breadcrumb: "Tenants > [name]")
2. Implement two-column layout (≥1024px) with main fields + config cards
3. Add collapsible Chatwoot integration section (collapsed by default)
4. Replace raw checkbox with `Toggle` for isActive
5. Use `Input` component for all fields
6. Slug field: show disabled with lock icon in edit mode
7. Wire `Button primary` for save, `Button outline` for cancel
8. Show inline validation errors under fields
**Verify:** Create flow works; edit flow works; Chatwoot section collapses/expands; toggle works; two-column on desktop

---

## T6 — Update App.tsx routing
**Spec:** SA-01  
**File:** `packages/web-admin/src/App.tsx`  
**Dependencies:** T2  
**Steps:**
1. AppShell is now inside each protected page (not in router) — verify `/login` does NOT render shell
2. Confirm logout from Sidebar clears localStorage and redirects
**Verify:** Sidebar absent on `/login`; sidebar present on `/` and `/tenants/*`
