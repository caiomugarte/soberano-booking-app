---
name: Web format tests — freeze time for calendar assertions
description: Month/year formatter tests become flaky when they assert fixed labels without mocking the system date
type: gotcha
---

## Gotcha: calendar label tests need a fixed clock

`packages/web/src/lib/format.ts` derives `getMonthLabel()` and `getYearLabel()` from `new Date()`.

If a test asserts a hard-coded label like `Abril 2026` or `2026`, it must freeze the clock with Vitest fake timers first. Otherwise the suite starts failing as soon as the real calendar moves forward, even though the production code is still correct.

**Fixed in quick deploy test hotfix:** `packages/web/src/lib/__tests__/format.test.ts` — wrap the month/year label assertions with `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2026-04-07T12:00:00'))`, then restore with `vi.useRealTimers()`.
