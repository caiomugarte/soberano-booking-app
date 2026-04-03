# Admin Manual Booking — User Decisions

Captured from spec discussion on 2026-04-02.

## GA-1: Past date booking
**Decision: Block past dates and past times on today.**
Barbers cannot book appointments in the past, including past hours on the current day.

## GA-2: WhatsApp notification
**Decision: Always send confirmation to the customer.**
Same notification as the customer-facing booking flow. For a future monthly plan feature, a single grouped summary message should be sent instead of 4 individual ones.

## GA-3: Monthly plan storage
**Decision: Deferred.**
Monthly plan was removed from this feature's scope. The grouped cancellation flow, special reminders, and plan tracking require a dedicated spec. Ship single manual booking first.

## GA-4: Time selection UX
**Decision: Free text time input (HH:mm).**
No slot picker. The barber types any time freely. The only constraint is that the slot must not already be occupied by another confirmed appointment. No shift restriction applies to admin-created bookings.
