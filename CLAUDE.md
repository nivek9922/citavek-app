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
queries.ts        # 'server-only' read-side queries (sometimes 'use cache').
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

### Testing

Tests live next to the code they test (`.test.ts`). Vitest with `environment: 'node'`. The `server-only` package is stubbed at `test/mocks/server-only.ts`. Domain and application layer tests use a fake repository (see `find-dead-slots.test.ts` for the pattern). Infrastructure isolation tests (`*.isolation.test.ts`) require a real DB and are typically skipped in CI without one.

## Product Vision

BookingFlow KR is a multi-tenant SaaS for appointment-based businesses (barber shops, salons). Each `Organization` is a tenant identified by its `slug`. The platform manages appointments, customers, staff schedules, subscriptions, and tenant branding. Timezone handling is per-tenant (`America/Bogota` default); all timestamps stored as `timestamptz`.
