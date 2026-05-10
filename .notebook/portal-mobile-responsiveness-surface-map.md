# Portal Mobile Responsiveness Surface Map

**Tags:** mobile, responsive, web-admin, web-bruno, layout
**Discovered:** 2026-05-05

## Overview

Mobile responsiveness for the internal portals is not a single-component issue. Both `packages/web-admin` and `packages/web-bruno` have desktop-first shell assumptions, and `web-bruno` also has several page-level dense layouts that will need a route audit.

## `packages/web-admin`

- Shell primitives:
  - `packages/web-admin/src/components/Sidebar.tsx`
  - `packages/web-admin/src/components/AppShell.tsx`
  - `packages/web-admin/src/components/PageHeader.tsx`
- Main page hotspots:
  - `packages/web-admin/src/pages/TenantListPage.tsx`
  - `packages/web-admin/src/pages/TenantFormPage.tsx`

Key findings:
- `Sidebar.tsx` is permanently fixed and has no open/close state
- `AppShell.tsx` hard-codes `pl-60`, so content always assumes a visible sidebar
- `TenantListPage.tsx` is a plain desktop table
- `TenantFormPage.tsx` uses desktop-first column and footer action layouts

## `packages/web-bruno`

- Shell primitives:
  - `packages/web-bruno/src/stores/ui.store.ts`
  - `packages/web-bruno/src/components/ui/Sidebar.tsx`
  - `packages/web-bruno/src/App.tsx`
- Main page and component hotspots:
  - `packages/web-bruno/src/components/agenda/WeeklyGrid.tsx`
  - `packages/web-bruno/src/pages/DashboardPage.tsx`
  - `packages/web-bruno/src/pages/PatientsPage.tsx`
  - `packages/web-bruno/src/pages/PatientDetailPage.tsx`
  - `packages/web-bruno/src/pages/FinancialPage.tsx`
  - `packages/web-bruno/src/components/financial/PendingPayments.tsx`
  - `packages/web-bruno/src/components/financial/RevenueChart.tsx`
  - `packages/web-bruno/src/components/patients/PatientHistory.tsx`
  - `packages/web-bruno/src/pages/SettingsPage.tsx`

Key findings:
- `ui.store.ts` already has `sidebarOpen`, `toggleSidebar()`, and `setSidebarOpen()`, but the shell does not consume them
- `App.tsx` uses a persistent sidebar inside `flex h-screen`, which keeps the desktop shell assumption
- `WeeklyGrid.tsx` renders a wide table with seven day columns plus time slots; this is the biggest likely mobile design decision
- `PendingPayments.tsx` and `PatientHistory.tsx` use horizontal content + action rows that will need stacking or wrapping
- `SettingsPage.tsx` contains multi-column form sections and row layouts that are likely cramped on small screens

## Scope Takeaway

This is best treated as a medium-scope frontend feature, not a one-file quick fix, because the sidebar issue is only the first blocker and multiple routes need a coordinated responsive pass.
