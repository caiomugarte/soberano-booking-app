# Portal Mobile Responsiveness — Specification

## Problem Statement

The internal portals are currently desktop-first. On small screens, navigation can block the content completely and several core pages overflow or become hard to operate.

The most immediate blocker is the sidebar behavior:

- `packages/web-admin/src/components/Sidebar.tsx` is always fixed and has no mobile open/close state.
- `packages/web-admin/src/components/AppShell.tsx` permanently offsets the content with `pl-60`, which assumes the sidebar is always visible.
- `packages/web-bruno/src/stores/ui.store.ts` already has sidebar state, but `packages/web-bruno/src/components/ui/Sidebar.tsx` and `packages/web-bruno/src/App.tsx` do not use it, so the shell still behaves like a desktop-only layout.

Beyond navigation, multiple `web-bruno` and `web-admin` screens use wide tables, fixed horizontal action rows, and multi-column forms that do not degrade well to mobile widths.

## Scope Decision

This change should use `tlc-spec-driven` in **medium scope**.

Why:
- It touches two frontend packages: `packages/web-admin` and `packages/web-bruno`
- The change spans shared layout primitives plus multiple route-level surfaces
- It needs explicit acceptance criteria for responsive navigation, page headers, dense data views, and a portal-wide mobile QA pass
- It does not require backend, schema, or architectural redesign, so a separate design doc can stay optional unless implementation reveals more than five dependent steps

## Goals

- [ ] `web-admin` and `web-bruno` are navigable on mobile without the sidebar trapping the screen
- [ ] Both portals provide a clear mobile navigation trigger, close behavior, and content overlay behavior
- [ ] Page headers and primary actions remain visible and operable on small screens
- [ ] Dense desktop layouts adapt for mobile without horizontal breakage blocking the core flow
- [ ] A manual responsive QA pass covers all internal portal routes before the work is considered done

## Out of Scope

| Feature | Reason |
|---|---|
| `packages/web` public booking site | The current request is about the internal portals |
| Tablet-specific redesign beyond standard responsive behavior | Not required unless mobile fixes expose a separate issue |
| New visual branding or design-system overhaul | This is a usability and layout pass, not a rebrand |
| Backend or API contract changes | The problem is in frontend layout and navigation |

## User Stories

### PMR-01 — Mobile shell and sidebar behavior

**User Story**: As a portal user on mobile, I want navigation to open and close predictably so I can reach page content without the sidebar permanently blocking the screen.

**Acceptance Criteria**:

1. WHEN a user opens `web-admin` or `web-bruno` on a small screen THEN the main content SHALL remain visible by default
2. WHEN the user taps a menu trigger THEN the sidebar SHALL open as an overlay or drawer instead of permanently occupying the layout
3. WHEN the sidebar is open on mobile THEN the UI SHALL provide a visible way to close it
4. WHEN the user taps a navigation item on mobile THEN the sidebar SHALL close after navigation
5. WHEN the user taps outside the open sidebar on mobile THEN the sidebar SHALL close
6. WHEN the screen is desktop-sized THEN the existing persistent-sidebar behavior MAY remain

### PMR-02 — Responsive page headers and actions

**User Story**: As a portal user on mobile, I want page titles, breadcrumbs, and primary actions to remain readable and reachable without clipping or overlap.

**Acceptance Criteria**:

1. WHEN a page header includes actions THEN the header SHALL wrap or stack cleanly on narrow widths
2. WHEN a page contains breadcrumbs or back actions THEN they SHALL remain usable without forcing horizontal scrolling
3. WHEN a page has multiple top-level actions THEN the layout SHALL preserve tap targets without overlap

### PMR-03 — Dense data views stay usable on mobile

**User Story**: As a portal user on mobile, I want tables, lists, and grids to remain usable so I can review and act on data without layout breakage.

**Acceptance Criteria**:

1. WHEN `web-admin` shows the tenant list THEN the data SHALL remain readable and actionable on mobile through a responsive table wrapper, stacked layout, or equivalent adaptive presentation
2. WHEN `web-bruno` shows the weekly agenda THEN the mobile experience SHALL allow date navigation and slot inspection without the screen becoming unusable
3. WHEN `web-bruno` shows pending-payment rows, patient-history rows, or similar horizontal action rows THEN the content SHALL wrap, stack, or otherwise remain operable on mobile
4. WHEN charts or summary cards appear on mobile THEN they SHALL fit the viewport without clipped controls or unreadable labels

### PMR-04 — Forms and settings flows adapt to narrow widths

**User Story**: As a portal user on mobile, I want forms and settings screens to adapt cleanly so I can edit records without zooming or fighting the layout.

**Acceptance Criteria**:

1. WHEN `web-admin` shows the tenant form THEN its column layout and footer actions SHALL adapt cleanly to small screens
2. WHEN `web-bruno` shows settings forms, shift controls, or absence controls THEN multi-column sections SHALL collapse to a usable single-column or stacked mobile layout
3. WHEN patient detail pages show action groups or information panels THEN the layout SHALL remain readable and tappable on mobile

### PMR-05 — Portal-wide responsive QA

**User Story**: As the team, we want a defined mobile audit so the fix does not stop at the first sidebar issue and leave other routes broken.

**Acceptance Criteria**:

1. WHEN the implementation is ready THEN the team SHALL verify `web-admin` routes `/login`, `/`, `/tenants/new`, and `/tenants/:id` on a mobile viewport
2. WHEN the implementation is ready THEN the team SHALL verify `web-bruno` routes `/login`, `/`, `/pacientes`, `/pacientes/:id`, `/financeiro`, and `/configuracoes` on a mobile viewport
3. WHEN a route still requires horizontal scrolling for its core flow THEN the feature SHALL remain open until that route has an explicit resolution or accepted exception

## Implementation Notes

### Web Admin

- Update the shell primitives:
  - [packages/web-admin/src/components/Sidebar.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-admin/src/components/Sidebar.tsx)
  - [packages/web-admin/src/components/AppShell.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-admin/src/components/AppShell.tsx)
  - [packages/web-admin/src/components/PageHeader.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-admin/src/components/PageHeader.tsx)
- Review page layouts:
  - [packages/web-admin/src/pages/TenantListPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-admin/src/pages/TenantListPage.tsx)
  - [packages/web-admin/src/pages/TenantFormPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-admin/src/pages/TenantFormPage.tsx)

Known issues from recon:
- Sidebar is permanently fixed with no close affordance
- Shell content is permanently offset for a visible sidebar
- Tenant list is a desktop table with no mobile-specific adaptation
- Tenant form uses desktop-first columns and footer action alignment

### Web Bruno

- Reuse the existing sidebar state in [packages/web-bruno/src/stores/ui.store.ts](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/stores/ui.store.ts)
- Update the shell:
  - [packages/web-bruno/src/components/ui/Sidebar.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/ui/Sidebar.tsx)
  - [packages/web-bruno/src/App.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/App.tsx)
- Review page and component hotspots:
  - [packages/web-bruno/src/components/agenda/WeeklyGrid.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/agenda/WeeklyGrid.tsx)
  - [packages/web-bruno/src/pages/DashboardPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/DashboardPage.tsx)
  - [packages/web-bruno/src/pages/PatientsPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/PatientsPage.tsx)
  - [packages/web-bruno/src/pages/PatientDetailPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/PatientDetailPage.tsx)
  - [packages/web-bruno/src/pages/FinancialPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/FinancialPage.tsx)
  - [packages/web-bruno/src/components/financial/PendingPayments.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/financial/PendingPayments.tsx)
  - [packages/web-bruno/src/components/financial/RevenueChart.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/financial/RevenueChart.tsx)
  - [packages/web-bruno/src/components/patients/PatientHistory.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/components/patients/PatientHistory.tsx)
  - [packages/web-bruno/src/pages/SettingsPage.tsx](/Users/caio.mugarte/Documents/projetos/soberano/packages/web-bruno/src/pages/SettingsPage.tsx)

Known issues from recon:
- Sidebar state exists but is not wired into the shell
- Protected layout uses a fixed desktop sidebar pattern
- Weekly agenda is a wide fixed table and likely needs an intentional mobile fallback, not just smaller spacing
- Several pages use horizontal header/action rows that will wrap poorly on mobile
- Settings and patient/history surfaces include multi-column or split rows that need stacking behavior

## Open Questions

1. For the weekly agenda on very small screens, should we prefer horizontal scrolling, a condensed day-by-day view, or a simplified mobile agenda variant?
2. Is the current request limited to the two internal portals (`web-admin` and `web-bruno`), or should the public `packages/web` booking site be audited in the same feature afterward?

Current recommendation:

- Keep this feature scoped to `web-admin` and `web-bruno`
- Start with responsive navigation plus layout fixes for all current routes
- Treat the `WeeklyGrid` mobile experience as the only potentially special-case component that may need a dedicated mobile presentation if simple overflow handling is not good enough

## Requirement Traceability

| ID | Requirement | Status |
|---|---|---|
| PMR-01 | Mobile shell and sidebar behavior | Pending |
| PMR-02 | Responsive page headers and actions | Pending |
| PMR-03 | Dense data views stay usable on mobile | Pending |
| PMR-04 | Forms and settings flows adapt to narrow widths | Pending |
| PMR-05 | Portal-wide responsive QA | Pending |

## Success Criteria

- [ ] Mobile users can navigate both internal portals without the sidebar trapping the UI
- [ ] All current `web-admin` routes are usable on a mobile viewport
- [ ] All current `web-bruno` routes are usable on a mobile viewport
- [ ] The weekly agenda has a defined and acceptable mobile behavior
