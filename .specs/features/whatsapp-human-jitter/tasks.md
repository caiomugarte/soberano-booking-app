# WhatsApp Human Jitter — Tasks

**Spec**: `.specs/features/whatsapp-human-jitter/spec.md`
**Status**: Draft

---

## Execution Plan

Single phase — sequential. T1 is a pure addition; T2 and T3 consume it.

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Add `gaussianDelay` utility function to reminder job

**What**: Add a self-contained `gaussianDelay(meanMs, stdMs, minMs, maxMs)` function at the top of the reminder job file using the Box-Muller transform. No external dependencies.
**Where**: `packages/api/src/infrastructure/jobs/reminder.job.ts`
**Depends on**: None
**Requirement**: WHJ-01

**Done when**:
- [ ] Function is defined with Box-Muller transform
- [ ] Clamps output between `minMs` and `maxMs`
- [ ] Returns a `Promise<void>` that resolves after the computed delay
- [ ] No new imports or dependencies added
- [ ] TypeScript compiles without errors (`pnpm --filter api tsc --noEmit`)

---

### T2: Apply `gaussianDelay` between sends in the customer reminder loop

**What**: Await `gaussianDelay(8000, 3000, 3000, 20000)` after each successful (or exhausted) send attempt in the customer reminder `for` loop — but only when there is a next iteration (skip delay after the last item).
**Where**: `packages/api/src/infrastructure/jobs/reminder.job.ts`
**Depends on**: T1
**Requirement**: WHJ-01 (AC1, AC3, AC4, AC5)

**Done when**:
- [ ] Delay is awaited between consecutive customer reminder sends
- [ ] No delay added after the last item in the loop
- [ ] Delay applies regardless of whether the send succeeded or exhausted retries (AC6)
- [ ] Existing error handling (`try/catch` per appointment) is unchanged
- [ ] TypeScript compiles without errors

---

### T3: Apply `gaussianDelay` between sends in the barber reminder loop

**What**: Same as T2 but in the barber reminder `for` loop.
**Where**: `packages/api/src/infrastructure/jobs/reminder.job.ts`
**Depends on**: T1
**Requirement**: WHJ-01 (AC2, AC3, AC4, AC5)

**Done when**:
- [ ] Delay is awaited between consecutive barber reminder sends
- [ ] No delay added after the last item in the loop
- [ ] Delay applies regardless of send outcome
- [ ] Existing error handling is unchanged
- [ ] TypeScript compiles without errors
- [ ] Single file commit: `feat(notifications): add gaussian jitter between whatsapp reminder sends`

---

## Parallel Execution Map

```
T1 ──→ T2 ──→ T3
```

T2 and T3 touch the same file, so they must be sequential to avoid merge conflicts.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Add gaussianDelay function | 1 function | ✅ Granular |
| T2: Jitter in customer loop | 1 loop, 1 await | ✅ Granular |
| T3: Jitter in barber loop | 1 loop, 1 await | ✅ Granular |
