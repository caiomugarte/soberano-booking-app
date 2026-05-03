# Quick Task 002 Summary

- Replaced the schedule page's UTC-based `toISOString().slice(0, 10)` usage with a Campo Grande timezone helper.
- This keeps the absence date input aligned with the business day used by the backend and avoids false "tomorrow-only" validation near midnight.
