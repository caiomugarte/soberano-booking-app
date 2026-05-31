# API Runtime Deploy Gotchas
> Shared API resource + per-instance reminder scheduler

Entry: `DEPLOY.md` (L11-22), `packages/api/src/server.ts` (L109-113)

Deploy shape:
- `DEPLOY.md` — API is a shared platform resource at `api.altion.com.br`
- `DEPLOY.md` (L16-22) — expected deploy model is 1 API + N frontend apps
- `docker-compose.infra.yaml` — API lives in the infra stack; web stacks do not proxy to it anymore
- When the API is deployed as a Coolify Compose stack, the stack must enable
  `Connect to Predefined Networks` to reach database internal hostnames on the
  destination network

Runtime:
- `packages/api/src/server.ts:startReminderJob()` — runs on every API process after `app.listen()`
- `packages/api/src/infrastructure/jobs/reminder.job.ts` — cron `*/15 * * * *`
- No env flag to disable reminders on secondary environments
- No visible single-run lock; multiple API instances can run the same scheduler at the same time

Operational implication:
- If prod + test both run API against the same DB/tenants, both schedulers process the same reminder workload
- If prod + test expose the same public API domain in Coolify/Traefik, routing conflicts can look like random API outages
- Production logger is `warn` in `packages/api/src/server.ts` (L24-27), so slow/hung requests may leave little evidence in app logs
- Custom `networks:` definitions inside the Coolify Compose stack can isolate
  the API from the destination network even when the app and DB are assigned to
  the same destination
- If frontend nginx shows `connect() failed (111: Connection refused)` to
  `http://api:3000` while the API logs show migrations completed and the
  reminder/materialization jobs started, the API process likely booted
  successfully and the frontend is resolving `api` to the wrong container or a
  crash-looping API instance on the shared Docker network

Updated: 2026-04-30
