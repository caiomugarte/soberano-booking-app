# Portal Mobile Responsiveness — Tasks

**Spec**: `.specs/features/portal-mobile-responsiveness/spec.md`
**Status**: Draft

---

## Execution Plan

### Phase 1 — Shell foundations (Parallel OK)

Each portal needs its responsive navigation foundation before page-level fixes can land cleanly.

```text
├── T1 [P] web-admin responsive shell
└── T4 [P] web-bruno responsive shell
```

### Phase 2 — Route and surface adaptation (Parallel OK after shell work)

Once each shell is mobile-safe, the page-level work can move independently inside each portal.

```text
T1 → T2 → T3
T4 → T5
T4 → T6
T4 → T7
```

### Phase 3 — Portal-wide QA and polish (Sequential)

After all route-level fixes are in place, run the mobile audit and close any remaining blockers.

```text
T2 + T3 + T5 + T6 + T7 → T8
```

---

## Parallel Execution Map

```text
Phase 1:
  ├── T1 [P]  web-admin shell + mobile nav behavior
  └── T4 [P]  web-bruno shell + mobile nav behavior

Phase 2:
  From T1:
    ├── T2  web-admin tenant list mobile adaptation
    └── T3  web-admin tenant form mobile adaptation

  From T4:
    ├── T5  web-bruno page headers and action bars
    ├── T6  web-bruno weekly agenda mobile behavior
    └── T7  web-bruno financial, patient history, and settings surfaces

Phase 3:
  T2 + T3 + T5 + T6 + T7 complete:
    └── T8  portal-wide mobile QA sweep and final polish
```

---

## Task Breakdown

### T1 [P]: Build a responsive shell for `web-admin`

**What**: Make the `web-admin` shell mobile-safe by adding a menu trigger, overlay/drawer sidebar behavior, close actions, and responsive header spacing.
**Where**:
- `packages/web-admin/src/components/Sidebar.tsx`
- `packages/web-admin/src/components/AppShell.tsx`
- `packages/web-admin/src/components/PageHeader.tsx`
**Depends on**: None
**Reuses**: Existing `AppShell` layout and `Sidebar` navigation structure
**Requirement**: PMR-01, PMR-02

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Mobile viewport shows page content by default without a permanently blocking sidebar
- [ ] A visible menu trigger opens the sidebar on small screens
- [ ] The sidebar can be closed from an explicit close action and by tapping the overlay
- [ ] Mobile navigation closes the sidebar after route changes
- [ ] Desktop retains a persistent sidebar layout
- [ ] Header spacing, breadcrumb area, and action placement remain usable across mobile and desktop widths
- [ ] `cd packages/web-admin && npm run build` exits 0

**Commit**: deferred

---

### T2: Adapt the `web-admin` tenant list for mobile

**What**: Make the tenant list route readable and actionable on narrow screens without breaking desktop presentation.
**Where**: `packages/web-admin/src/pages/TenantListPage.tsx`
**Depends on**: T1
**Reuses**: Existing tenant query, `Badge`, `Button`, and `Card` components
**Requirement**: PMR-02, PMR-03, PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The page header actions remain tappable and visible on mobile
- [ ] Tenant data is readable on small screens through an adaptive table wrapper, stacked presentation, or equivalent responsive layout
- [ ] The primary `Editar` action remains reachable without awkward horizontal panning for the core flow
- [ ] Loading and empty states remain visually stable on mobile
- [ ] Desktop list behavior remains intact
- [ ] `cd packages/web-admin && npm run build` exits 0

**Commit**: deferred

---

### T3: Adapt the `web-admin` tenant form for mobile

**What**: Make the tenant form route usable on mobile by collapsing desktop columns, keeping field groups readable, and stacking footer actions cleanly.
**Where**: `packages/web-admin/src/pages/TenantFormPage.tsx`
**Depends on**: T1
**Reuses**: Existing `Card`, `Input`, `Toggle`, and collapsible Chatwoot section
**Requirement**: PMR-02, PMR-04, PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Main form content collapses cleanly from multi-column desktop layout to a mobile-friendly stacked layout
- [ ] Footer actions and error messaging remain readable and tappable on narrow widths
- [ ] The Chatwoot section remains operable without layout breakage on mobile
- [ ] Breadcrumb/navigation affordances stay usable on small screens
- [ ] Desktop editing flow remains unchanged functionally
- [ ] `cd packages/web-admin && npm run build` exits 0

**Commit**: `feat(web-admin): make tenant management responsive`

---

### T4 [P]: Wire the existing `web-bruno` sidebar state into a responsive shell

**What**: Use the existing UI store to make the `web-bruno` shell support mobile drawer navigation, close behavior, and a responsive content container.
**Where**:
- `packages/web-bruno/src/stores/ui.store.ts`
- `packages/web-bruno/src/components/ui/Sidebar.tsx`
- `packages/web-bruno/src/App.tsx`
**Depends on**: None
**Reuses**: Existing `sidebarOpen`, `toggleSidebar()`, and `setSidebarOpen()` state in `ui.store.ts`
**Requirement**: PMR-01, PMR-02

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Mobile viewport shows route content by default
- [ ] `web-bruno` has a visible menu trigger on protected routes
- [ ] The sidebar opens as a drawer/overlay on mobile and stays persistent on desktop
- [ ] Overlay tap and explicit close behavior both work
- [ ] Selecting a nav item on mobile closes the sidebar
- [ ] The shell content area remains scrollable and usable on mobile without desktop-only assumptions
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred

---

### T5: Make `web-bruno` page headers and primary action bars wrap cleanly

**What**: Update the top-level route headers and action groups so titles, back buttons, and primary actions remain usable on narrow screens.
**Where**:
- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/pages/PatientsPage.tsx`
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
**Depends on**: T4
**Reuses**: Existing route composition and `Button` component patterns
**Requirement**: PMR-02, PMR-04, PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Route headers no longer rely on one-line desktop alignment to remain usable
- [ ] Back buttons, page titles, and action groups wrap or stack without overlap
- [ ] Patient detail top actions remain tappable and readable on mobile
- [ ] No route-level header requires horizontal scrolling for the core flow
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred

---

### T6: Define and implement mobile behavior for the `web-bruno` weekly agenda

**What**: Make the weekly agenda usable on mobile, including week navigation and slot inspection, with an explicit responsive behavior for the wide scheduling grid.
**Where**:
- `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
- `packages/web-bruno/src/components/agenda/WeekNavigator.tsx`
- `packages/web-bruno/src/components/agenda/TimeSlot.tsx`
- `packages/web-bruno/src/components/agenda/SlotDetail.tsx`
**Depends on**: T4
**Reuses**: Existing weekly agenda interactions and detail modal flow
**Requirement**: PMR-03, PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] The weekly agenda has a deliberate mobile behavior rather than only shrinking desktop spacing
- [ ] Week navigation remains readable and tappable on narrow screens
- [ ] Users can inspect existing slots and reach slot actions on mobile
- [ ] Empty-slot creation flow remains usable on mobile
- [ ] If horizontal scrolling remains necessary for the grid, it is constrained and does not block the core agenda flow
- [ ] Desktop agenda behavior remains intact
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: deferred

---

### T7: Adapt dense `web-bruno` secondary surfaces for mobile

**What**: Make the remaining dense financial, patient-history, and settings surfaces responsive so mobile users can review data and perform actions without layout breakage.
**Where**:
- `packages/web-bruno/src/components/financial/PendingPayments.tsx`
- `packages/web-bruno/src/components/financial/RevenueSummary.tsx`
- `packages/web-bruno/src/components/financial/RevenueChart.tsx`
- `packages/web-bruno/src/components/patients/PatientHistory.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
**Depends on**: T4
**Reuses**: Existing `Panel`, summary-card, chart, and row-action patterns
**Requirement**: PMR-03, PMR-04, PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] Pending payment rows wrap or stack without losing their actions
- [ ] Patient history rows remain readable and actionable on small screens
- [ ] Revenue summary cards fit mobile widths without clipping
- [ ] Revenue chart controls and labels remain usable on small screens
- [ ] Settings sections with multi-column or row-based controls collapse to a workable mobile layout
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(web-bruno): make portal surfaces responsive on mobile`

---

### T8: Run a portal-wide mobile QA sweep and close remaining blockers

**What**: Verify every in-scope route on a mobile viewport and fix any final overflow, tap-target, or navigation blockers discovered during the audit.
**Where**:
- `packages/web-admin/src/pages/LoginPage.tsx`
- `packages/web-admin/src/pages/TenantListPage.tsx`
- `packages/web-admin/src/pages/TenantFormPage.tsx`
- `packages/web-bruno/src/pages/LoginPage.tsx`
- `packages/web-bruno/src/pages/DashboardPage.tsx`
- `packages/web-bruno/src/pages/PatientsPage.tsx`
- `packages/web-bruno/src/pages/PatientDetailPage.tsx`
- `packages/web-bruno/src/pages/FinancialPage.tsx`
- `packages/web-bruno/src/pages/SettingsPage.tsx`
**Depends on**: T2, T3, T5, T6, T7
**Reuses**: The route inventory and acceptance criteria from the feature spec
**Requirement**: PMR-05

**Tools**:
- MCP: NONE
- Skill: `coding-guidelines`, `react-best-practices`

**Done when**:
- [ ] `web-admin` routes `/login`, `/`, `/tenants/new`, and `/tenants/:id` have been checked against the mobile acceptance criteria
- [ ] `web-bruno` routes `/login`, `/`, `/pacientes`, `/pacientes/:id`, `/financeiro`, and `/configuracoes` have been checked against the mobile acceptance criteria
- [ ] Any remaining route that still needs horizontal scrolling for its core flow is either fixed or explicitly documented as an accepted exception
- [ ] Final build succeeds for both frontend packages
- [ ] `cd packages/web-admin && npm run build` exits 0
- [ ] `cd packages/web-bruno && npm run build` exits 0

**Commit**: `feat(portals): finish mobile responsiveness pass`

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: `web-admin` responsive shell | 3 tightly coupled shell files | ✅ Cohesive |
| T2: `web-admin` tenant list mobile adaptation | 1 page | ✅ Granular |
| T3: `web-admin` tenant form mobile adaptation | 1 page | ✅ Granular |
| T4: `web-bruno` responsive shell | shell + existing store wiring | ✅ Cohesive |
| T5: `web-bruno` page headers and action bars | related route-header surfaces | ✅ Cohesive |
| T6: `web-bruno` weekly agenda mobile behavior | one focused feature surface | ✅ Cohesive |
| T7: dense `web-bruno` secondary surfaces | related financial/history/settings layouts | ✅ Cohesive |
| T8: portal-wide mobile QA sweep | verification + final polish | ✅ Appropriate final task |

---

## Verification Notes

- Package verification:
  - `cd packages/web-admin && npm run build`
  - `cd packages/web-bruno && npm run build`
- Manual mobile QA should use the route list from PMR-05 in the spec.
- The weekly agenda should be checked separately at a narrow mobile width because it is the highest-risk responsive surface.
