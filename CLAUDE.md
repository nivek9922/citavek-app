# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server (runs predev node version check first)
npm run build         # Production build
npm run lint          # ESLint with zero warnings tolerance
npm run typecheck     # tsc --noEmit
npm run test          # vitest run (single pass)
npm run test:watch    # vitest interactive
npm run validate      # typecheck + lint + test (run before committing)

npm run db:migrate    # prisma migrate dev
npm run db:seed       # tsx prisma/seed.ts
npm run db:studio     # Prisma Studio
npm run db:reset      # prisma migrate reset (destructive)
```

**Node requirement**: ≥20.9.0. If running in a shell with Node 18 (system default), export nvm's Node 20+ to PATH before running Prisma or Vitest.

**Running a single test file**:
```bash
npx vitest run modules/scheduling/application/find-dead-slots.test.ts
```

**Prisma client is generated to `generated/prisma/`** (not `node_modules/@prisma/client`). Always import from `@/generated/prisma/client`.

---

## Architecture

### Top-level layout

```
modules/          # Business domains — primary area to work in
server/           # Server-only singletons (db, auth, guards, rbac, tenant)
shared/           # Cross-cutting utilities and primitive UI components
app/              # Next.js App Router (routing shell only — no business logic)
config/env.ts     # Zod-validated environment schema; validated at startup
lib/              # Client-side utilities (auth-client.ts)
test/mocks/       # server-only.ts stub for vitest
```

### Module internal layout

Each domain module under `modules/<name>/` follows:
```
domain/           # Entities, value objects, ports (interfaces). Zero external deps.
application/      # Use cases. No Prisma imports. Receives/returns plain DTOs.
infrastructure/   # Prisma adapter implementing the domain port.
ui/               # React components for the panel or public pages.
actions.ts        # 'use server' — auth/validation boundary → calls use cases.
queries.ts        # 'server-only' read-side queries (uses 'use cache' directive).
```

`modules/scheduling` is the reference implementation — it demonstrates the complete pattern including advisory locks, slot calculator, ports, full test coverage, and proper guard placement.

### Server singletons (`server/`)

| File | Purpose |
|---|---|
| `db.ts` | Prisma singleton via `@prisma/adapter-pg` |
| `tenant.ts` | `getTenantContext(slug)` — resolves and caches the tenant; deduped per request via React `cache()` |
| `auth-guards.ts` | `requireSession`, `requireMembership`, `requirePermission` |
| `rbac.ts` | Flat permissions map: `{ 'permission:action': ['owner', 'barber'] }` |
| `session.ts` | Thin wrapper over better-auth session |
| `rate-limit.ts` | In-memory sliding window rate limiter |

### Routing

- `app/[tenant]/` — public booking flow for a specific tenant
- `app/[tenant]/panel/` — owner/barber management panel (gated by `requireMembership`)
- `app/admin/` — super-admin panel (gated by `requireSuperAdmin`)
- `app/api/auth/` — better-auth route handler
- `app/api/cron/` — cron jobs (verified by secret header)

### Tenant resolution flow

Every request involving a tenant starts with:
```ts
const ctx = await getTenantContext(slug)   // resolves org from slug, 404 if not found
await requirePermission(ctx.id, 'permission:action')  // auth + role check
```

`getTenantContext` is a two-layer cache: `'use cache'` with `cacheTag('tenant:${slug}')` for persistence, wrapped in React `cache()` for per-request deduplication.

### Cache strategy

- **Reads**: Use `'use cache'` directive inside `queries.ts` functions with `cacheTag('resource:${organizationId}')` and `cacheLife('max')`.
- **Writes**: Call `updateTag('resource:${organizationId}')` inside `actions.ts` after a successful mutation.
- **Legacy**: Some actions still use `revalidatePath` — migrate to `updateTag` when touching them.
- Tag convention: `services:${orgId}`, `barbers:${orgId}`, `tenant:${slug}` — always scoped to tenant.

### Server Actions pattern

```ts
// Guards OUTSIDE try/catch — redirect()/notFound() throw control-flow errors
// that catch would silently swallow.
const ctx = await getTenantContext(slug)
await requirePermission(ctx.id, 'permission:action')

try {
  const parsed = schema.parse(input)
  const result = await useCase(repo, { organizationId: ctx.id, ...parsed })
  if (result.ok) updateTag(`resource:${ctx.id}`)
  return result
} catch (err) {
  log.error('actionName', { err: String(err) })
  return { ok: false, error: 'Message shown to the user.' }
}
```

### Multi-tenant safety rule

`organizationId` is **always** derived from `getTenantContext(slug)` on the server. It is **never** accepted from client input. Every Prisma query in repositories must include `organizationId` in the `where` clause.

---

## Business Modules

| Module | Status | Responsibility |
|---|---|---|
| `catalog` | Stable | Services (cortes/tratamientos): CRUD, images, ordering, toggle active |
| `scheduling` | Stable — reference impl. | Availability engine, slot calculator, appointment state machine |
| `staff` | Stable | Barbers: profiles, schedules, working hours |
| `tenancy` | Stable | Organization config, branding, calendar blocks, AdminNote |
| `identity` | Stable | Auth: registration, login, session (Better Auth) |
| `onboarding` | Stable | Tenant onboarding funnel tracking |
| `customers` | In development | Customer profiles, booking history |
| `analytics` | In development | Churn score, telemetry, MRR metrics (Super Admin) |
| `reviews` | Pending | Customer reviews per appointment |

When adding code to an existing module, check this table first to confirm the right module. When creating a new module, follow the layout of `modules/scheduling` exactly.

---

## Anti-patterns — Never do these

These are explicitly forbidden. If you find existing code that violates these rules, flag it but do not refactor it unless the task explicitly asks for it.

### Architecture
- **Never import Prisma in `application/`** — use cases receive repository ports (interfaces), not Prisma directly.
- **Never put business logic in `actions.ts`** — it is a delivery boundary only (validate → guard → call use case → return result).
- **Never import from `infrastructure/` or `domain/` directly in `ui/`** — go through `queries.ts` or `actions.ts`.
- **Never create a module without `queries.ts`** — read-side and write-side must always be separated.

### Multi-tenant
- **Never accept `organizationId` from client input** (form data, URL params, request body) — always derive it from `getTenantContext(slug)` on the server.
- **Never run a Prisma query without `organizationId` in the `where` clause** in a repository.
- **Never use `tenantId`, `orgId`, or any alias** — the field is `organizationId` everywhere.

### Cache
- **Never use `revalidatePath` in new code** — use `updateTag('resource:${organizationId}')`.

### UI & Feedback
- **Never use `useState` as the primary feedback mechanism after a Server Action** — always use `toast.success()` / `toast.error()` from `sonner`.
- **Never use `<input type="date">` or any native date input** — always use `<DatePicker>` from `shared/ui/date-picker.tsx`.
- **Never execute a destructive action (delete, suspend, reset, revoke) without an `<AlertDialog>` confirmation step.**

### Guards
- **Never place `getTenantContext` or `requirePermission` inside a try/catch block** — they must be outside so `redirect()` and `notFound()` can throw correctly.

---

## Testing

Tests live next to the code they test (`.test.ts`). Vitest with `environment: 'node'`. The `server-only` package is stubbed at `test/mocks/server-only.ts`. Domain and application layer tests use a fake repository (see `find-dead-slots.test.ts` for the pattern). Infrastructure isolation tests (`*.isolation.test.ts`) require a real DB and are typically skipped in CI without one.

---

## UI Component Stack

### Installed UI libraries

| Library | Version | Purpose |
|---|---|---|
| `sonner` | ^2.0.7 | Toast system — `import { toast } from 'sonner'` |
| `react-day-picker` | ^10.0.1 | Base for the internal calendar; do not use directly |
| shadcn/ui `Sheet` | — | Side panel for detail/edit flows |
| shadcn/ui `AlertDialog` | — | Confirmation for destructive actions |

The `<DatePicker>` component lives at `shared/ui/date-picker.tsx` and wraps react-day-picker + Radix Popover. It is the only date picker allowed in the project.

### MANDATORY RULE — Server Action feedback

**All user feedback after a Server Action MUST use the toast system (sonner).**

```ts
const res = await someAction(data)
if (res.ok) toast.success('Operación completada.')
else        toast.error(res.error)
```

- `toast.success()` for positive confirmations.
- `toast.error()` for errors returned by the action.
- **Forbidden:** `useState` with error/success message as primary visible feedback. Only use local state to control UI visibility (e.g., closing a Sheet after success).

---

## Product Vision

BookingFlow KR is a multi-tenant SaaS for appointment-based businesses (barber shops, salons). Each `Organization` is a tenant identified by its `slug`. The platform manages appointments, customers, staff schedules, subscriptions, and tenant branding. Timezone handling is per-tenant (`America/Bogota` default); all timestamps stored as `timestamptz`.