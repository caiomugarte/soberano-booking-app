# Quick Task 001: Fix Chatwoot conversation inbox filtering

**Date:** 2026-04-06
**Status:** In Progress

## Description

`findOrCreateConversation` returns the first conversation for a contact regardless of inbox, causing every outbound message (booking confirmations, cancellations, changes, reminders — customer and barber) to reuse the prod inbox conversation when a contact exists in both inboxes.

## Root Cause

In `chatwoot.client.ts`, `findOrCreateConversation` fetches all conversations for a contact and returns `conversations[0]` without checking `inbox_id`. When a contact is registered in two inboxes (e.g. dev + prod), Chatwoot returns conversations from both — the prod conversation may come first, so messages are sent through the wrong number.

```ts
// Bug: ignores this.inboxId
if (conversations.length > 0) {
  return conversations[0];
}
```

## Fix

Add `inbox_id` to the `ChatwootConversation` interface and filter conversations by `this.inboxId` before falling back to create:

```ts
interface ChatwootConversation {
  id: number;
  inbox_id: number;
}

// In findOrCreateConversation:
const match = conversations.find((c) => c.inbox_id === this.inboxId);
if (match) return match;
```

## Files Changed

- `packages/api/src/infrastructure/notifications/chatwoot.client.ts` — filter conversations by inbox_id; add inbox_id to ChatwootConversation interface

## Verification

- [ ] All message types (booking confirmation, cancellation, change notice, customer reminder, barber reminder, barber notification) send through the correct inbox
- [ ] Message to a contact registered in both dev and prod inboxes arrives from the dev number only
- [ ] When no conversation exists for the configured inbox, a new conversation is created (existing create path unchanged)
- [ ] TypeScript compiles without errors

## Commit

`fix(notifications): filter chatwoot conversations by inbox to prevent cross-env sends`
