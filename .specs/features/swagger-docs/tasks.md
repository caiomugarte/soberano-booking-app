# Tasks: Swagger / OpenAPI Documentation

## Status: Ready to execute

## Task List

### T1 — Install dependencies
Install `@fastify/swagger`, `@fastify/swagger-ui`, and `fastify-type-provider-zod`.

```bash
cd packages/api && npm install @fastify/swagger @fastify/swagger-ui fastify-type-provider-zod
```

**Verify:** `package.json` dependencies updated; `npm install` exits 0.

---

### T2 — Register Swagger plugins in `server.ts`
In `packages/api/src/server.ts`, add before any route registrations:

1. Import `@fastify/swagger`, `@fastify/swagger-ui`, `fastify-type-provider-zod` (`serializerCompiler`, `validatorCompiler`, `ZodTypeProvider`)
2. Set `app.setValidatorCompiler(validatorCompiler)` and `app.setSerializerCompiler(serializerCompiler)` — enables Zod as the type provider globally
3. Register `@fastify/swagger` with:
   - `openapi.info`: `{ title: 'Soberano API', version: '1.0.0', description: 'Barbershop booking SaaS API' }`
   - `openapi.components.securitySchemes`: `{ bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }`
4. Register `@fastify/swagger-ui` with `routePrefix: '/docs'` and `uiConfig: { docExpansion: 'list' }`

**Both plugins must be registered BEFORE route registrations** (Fastify plugin order matters).

**Verify:** `GET /docs` returns HTML; `GET /docs/json` returns JSON with `openapi: '3.0.x'`.

---

### T3 — Annotate `booking.routes.ts`

Import `slotsQuerySchema`, `bookingSchema` from `@soberano/shared`.

Add `schema` objects to the 3 routes:

**GET `/slots`**
```ts
schema: {
  tags: ['Booking'],
  summary: 'Get available time slots',
  querystring: slotsQuerySchema,
  response: { 200: z.object({ slots: z.array(z.string()) }) },
}
```

**GET `/customer/name`**
```ts
schema: {
  tags: ['Booking'],
  summary: 'Look up customer name by phone',
  querystring: z.object({ phone: z.string().regex(/^\d{10,11}$/) }),
  response: { 200: z.object({ name: z.string().nullable() }) },
}
```

**POST `/book`**
```ts
schema: {
  tags: ['Booking'],
  summary: 'Create a booking',
  body: bookingSchema,
  response: { 201: z.object({ cancelUrl: z.string(), appointment: z.any() }) },
}
```

**Verify:** Booking tag appears in `/docs/json` with 3 paths.

---

### T4 — Annotate `appointment.routes.ts`

Import `cancelAppointmentSchema`, `changeAppointmentSchema` from `@soberano/shared`.

**GET `/appointment/:token`**
```ts
schema: {
  tags: ['Appointments'],
  summary: 'View appointment by cancel token',
  params: z.object({ token: z.string() }),
  response: { 200: z.object({ appointment: z.any() }) },
}
```

**PATCH `/appointment/:token/cancel`**
```ts
schema: {
  tags: ['Appointments'],
  summary: 'Cancel appointment (customer self-service)',
  params: z.object({ token: z.string() }),
  body: cancelAppointmentSchema,
  response: { 200: z.object({ message: z.string() }) },
}
```

**PATCH `/appointment/:token/change`**
```ts
schema: {
  tags: ['Appointments'],
  summary: 'Reschedule appointment (customer self-service)',
  params: z.object({ token: z.string() }),
  body: changeAppointmentSchema,
  response: { 200: z.object({ appointment: z.any() }) },
}
```

**Verify:** Appointments tag appears with 3 paths.

---

### T5 — Annotate `service.routes.ts`

**GET `/services`**
```ts
schema: {
  tags: ['Services'],
  summary: 'List all active services',
  response: { 200: z.object({ services: z.array(z.any()) }) },
}
```

**Verify:** Services tag appears with 1 path.

---

### T6 — Annotate `barber.routes.ts`

**GET `/barbers`**
```ts
schema: {
  tags: ['Barbers'],
  summary: 'List all active barbers with their work days',
  response: { 200: z.object({ barbers: z.array(z.any()) }) },
}
```

**Verify:** Barbers tag appears with 1 path.

---

### T7 — Annotate `auth.routes.ts`

Import `barberLoginSchema` from `@soberano/shared`.

**POST `/auth/login`**
```ts
schema: {
  tags: ['Auth'],
  summary: 'Barber login — returns access token',
  body: barberLoginSchema,
  response: { 200: z.object({ accessToken: z.string() }) },
}
```

**POST `/auth/logout`**
```ts
schema: {
  tags: ['Auth'],
  summary: 'Logout — clears refresh token cookie',
  response: { 200: z.object({ message: z.string() }) },
}
```

**POST `/auth/refresh`**
```ts
schema: {
  tags: ['Auth'],
  summary: 'Refresh access token using cookie',
  response: {
    200: z.object({ accessToken: z.string() }),
    401: z.object({ error: z.string(), message: z.string() }),
  },
}
```

**Verify:** Auth tag appears with 3 paths.

---

### T8 — Annotate `admin.routes.ts`

All routes use `security: [{ bearerAuth: [] }]`. Import `bookingSchema` from `@soberano/shared`.

| Route | Method | Summary |
|-------|--------|---------|
| `/admin/me` | GET | Get logged-in barber profile |
| `/admin/appointments` | GET | Get barber's appointments for a date |
| `/admin/appointments/range` | GET | Get appointments for a date range |
| `/admin/appointments/:id` | PATCH | Update appointment status |
| `/admin/appointments/:id` | DELETE | Delete appointment |
| `/admin/appointments` | POST | Admin creates appointment for customer |
| `/admin/appointments/:id/cancel` | POST | Barber cancels appointment + notifies customer |
| `/admin/customers/lookup` | GET | Look up customer by phone |

All schemas: `tags: ['Admin'], security: [{ bearerAuth: [] }]`.

Body/query schemas:
- GET appointments: `querystring: z.object({ date: z.string().optional() })`
- GET range: `querystring: z.object({ from: z.string(), to: z.string() })`
- GET stats: `querystring: z.object({ from: z.string(), to: z.string() })`
- PATCH status: `body: z.object({ status: z.enum(['completed', 'no_show']) })`
- POST appointments: `body: bookingSchema.omit({ barberId: true }).extend({ customerPhone: z.string().optional() })`
- POST cancel: `body: z.object({ reason: z.string().min(1).max(300) })`
- GET lookup: `querystring: z.object({ phone: z.string() })`

**Note:** `/admin/stats` is also present in this file — annotate it too.

**Verify:** Admin tag appears with 8 paths, all showing lock icon in UI.

---

### T9 — Annotate `schedule.routes.ts`

All routes use `security: [{ bearerAuth: [] }]`.

Local Zod schemas (`shiftSchema`, `absenceSchema`) are already defined in the file — reference them.

| Route | Method | Summary |
|-------|--------|---------|
| `/admin/schedule/shifts` | GET | Get barber's work shifts |
| `/admin/schedule/shifts` | PUT | Replace all shifts (full schedule) |
| `/admin/schedule/absences` | GET | Get barber's absences |
| `/admin/schedule/absences` | POST | Add absence |
| `/admin/schedule/absences/:id` | DELETE | Remove absence |

All with `tags: ['Schedule'], security: [{ bearerAuth: [] }]`.

**Verify:** Schedule tag appears with 5 paths.

---

### T10 — Annotate `client.routes.ts`

**GET `/client/config`**
```ts
schema: {
  tags: ['Client'],
  summary: 'Get tenant configuration (public)',
  response: {
    200: z.object({
      name: z.string(),
      timezone: z.string(),
      enabledFeatures: z.array(z.string()),
      theme: z.any(),
    }),
  },
}
```

**Verify:** Client tag appears with 1 path.

---

### T11 — Annotate `super-admin.routes.ts`

**POST `/super-admin/login`** — no bearer (public login)
```ts
schema: {
  tags: ['Super Admin'],
  summary: 'Super-admin login',
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
  response: { 200: z.object({ accessToken: z.string() }) },
}
```

**GET `/super-admin/clients`** — `security: [{ bearerAuth: [] }]`
```ts
schema: { tags: ['Super Admin'], summary: 'List all tenants', security: [{ bearerAuth: [] }] }
```

**POST `/super-admin/clients`** — `security: [{ bearerAuth: [] }]`
```ts
schema: {
  tags: ['Super Admin'],
  summary: 'Create new tenant',
  body: createClientSchema,
  security: [{ bearerAuth: [] }],
}
```

**PATCH `/super-admin/clients/:id/features`** — `security: [{ bearerAuth: [] }]`
```ts
schema: {
  tags: ['Super Admin'],
  summary: 'Update tenant enabled features',
  params: z.object({ id: z.string() }),
  body: z.object({ features: z.array(z.string()) }),
  security: [{ bearerAuth: [] }],
}
```

**Verify:** Super Admin tag appears with 4 paths.

---

### T12 — Update `STATE.md`

Add `swagger-docs` to the Active Features table with status `Tasks ready — ready to execute`.

---

## Execution Order

T1 → T2 → T3–T11 (parallel, each route file independent) → T12

## Full Acceptance Check

```
GET /docs         → Swagger UI HTML
GET /docs/json    → OpenAPI 3.0 JSON with 9 tags, 30+ paths, bearerAuth scheme
tsc --noEmit      → 0 errors
vitest run        → all tests pass
```
