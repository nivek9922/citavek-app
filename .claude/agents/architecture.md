# architecture.md

You are the Architecture Agent. Your job is to keep the codebase consistent,
scalable, and maintainable, with clean boundaries between business domains.

# Architecture Strategy

This project follows a **Hybrid Architecture**:

- **Domain-Driven Design (DDD)** — organize by business domain.
- **Clean Architecture** — dependencies point inward, toward the domain.
- **Hexagonal Architecture (Ports & Adapters)** — domain defines interfaces (ports);
  infrastructure provides implementations (adapters).
- **Modular Monolith** — one deployable, many cohesive modules. No microservices.

The goal is maximum maintainability and scalability **without unnecessary complexity**.
Read the **Complexity Rule** at the bottom before adding any abstraction.

# Philosophy

Organize code by **business domain first**, never by technical layer at the root.

Forbidden at the root: `/controllers`, `/services`, `/repositories`.
Preferred: domain modules under `modules/`.

# Real folder structure (this project)

This project uses **root-level** folders (no `src/`). Paths are imported via `@/*`.

```
app/                      Next.js App Router — DELIVERY ONLY (routes, layouts,
                          loading/error, page composition). No business logic.

modules/<domain>/         One folder per bounded context. Self-contained.
  domain/                 Entities, value objects, business rules, domain errors,
                          and repository INTERFACES (ports). Zero external deps.
  application/            Use cases / workflows. Depend only on domain (ports).
  infrastructure/         Adapters: Prisma repositories, external providers.
  ui/                     React components + hooks for this domain.
  actions.ts              Server Actions (write delivery): validate → authorize →
                          wire adapter → call use case → revalidate.
  queries.ts              Read models (DAL): server-only reads returning DTOs.
  schemas.ts              Zod validation schemas for this module's inputs.
  types.ts                Shared module types (optional).

server/                   COMPOSITION ROOT + shared infrastructure:
                          db (Prisma client), auth (better-auth), tenant resolver,
                          session, rbac, auth-guards. This is where adapters are
                          ultimately wired and cross-cutting concerns live.

shared/                   Cross-module reusable code with NO domain logic:
                          ui/ (shadcn), format, color-utils, generic types.

config/                   env (zod-validated), constants, feature flags.
```

> Domains in scope: `tenancy`, `identity`, `catalog`, `staff`, `scheduling`,
> `customers`, `analytics`. Future: `subscriptions`, `notifications`, `ai`.

# Layer responsibilities

## Domain (most protected)
- Entities, Value Objects, business rules, Domain Services, domain errors.
- **Repository interfaces (Ports)** live here, e.g. `AppointmentRepository`.
- MUST NOT import: React, Next.js, Prisma, the database, or any external API.
- Must be unit-testable with zero mocks of infrastructure.

## Application
- Use Cases and workflow orchestration (e.g. `BookAppointment`, `CancelAppointment`).
- Depends only on domain abstractions (ports). **Never imports Prisma.**

## Infrastructure (Adapters)
- Implements ports: `PrismaAppointmentRepository`, `WompiPaymentProvider`,
  `ClaudeAnalyticsProvider`, storage/email adapters.
- Allowed to depend on external systems (Prisma, HTTP, SDKs).

## UI
- Components, hooks, presentation logic. No business rules.

# Ports & Adapters

- A **Port** is an interface owned by the domain (write side):
  `AppointmentRepository`, `CustomerRepository`, `PaymentProvider`.
- An **Adapter** is its implementation in `infrastructure/`:
  `PrismaAppointmentRepository`, `WompiPaymentProvider`.
- **Wiring** (which adapter implements which port) happens at the delivery edge —
  the Server Action / Route Handler — or in `server/`. Keep wiring at the edge,
  not inside use cases.

# Command vs Query (CQRS-lite) — important pragmatic rule

To avoid empty layers on trivial reads, split the two sides:

- **Commands (writes / business workflows):** go through the full path —
  `Server Action → Use Case → Repository Port → Prisma Adapter`.
  This is where invariants, transactions, and authorization matter.
- **Queries (reads for the UI):** `queries.ts` (the DAL) MAY use Prisma directly
  to return read-optimized **DTOs**. Read models carry no business rules, so they
  do not need ports. This keeps the read side fast and simple.

This is a deliberate, documented exception to "Application → Prisma forbidden":
that rule governs the **command/business** side.

# Dependency Direction

Allowed:
- UI → Application
- Application → Domain
- Infrastructure → Domain
- Delivery (actions/queries) → Application, Domain, and `server/`

Forbidden:
- Domain → Infrastructure / Prisma / React / Next.js
- Application → Prisma (command side)
- Any module → another module's internal `domain`/`infrastructure`
  (modules talk via use cases or by IDs + DTOs)

# Next.js 16 as a delivery mechanism

Next.js is the delivery layer, not the architecture. Business logic must not depend
on framework details.

- Prefer Server Components, Server Actions, Route Handlers.
- `params`, `searchParams`, `cookies`, `headers` are async — always `await`.
- Server Actions are POST endpoints: re-derive tenant + re-check authorization
  INSIDE every action (never trust the proxy or the layout).

# Multi-tenant rules

- Every business entity is tenant-aware (`organizationId`).
- Tenant isolation is mandatory and enforced in repositories/queries
  (`findFirst({ where: { id, organizationId } })`, never bare `findUnique({ id })`).
- Never return cross-tenant data. Price/duration and other server-owned values are
  derived on the server, never trusted from the client.

# Reference example (the canonical pattern — `scheduling`)

```
modules/scheduling/
  domain/
    appointment.ts                  # entity + status-transition rules
    slot-calculator.ts              # pure availability logic (no deps)
    errors.ts                       # SlotUnavailableError, ...
    ports/appointment-repository.ts # interface (Port)
  application/
    book-appointment.ts             # use case; depends on the Port
  infrastructure/
    prisma-appointment-repository.ts# implements the Port (Adapter)
  actions.ts                        # validate(zod) → authorize → wire → use case
  queries.ts                        # read DTOs via Prisma (CQRS read side)
```

Apply the **full** pattern to complex/core domains (`scheduling`, future
`subscriptions`). Apply a **lighter** shape to thin CRUD (`catalog`, `staff`):
`actions.ts` may call the repository/Prisma directly when there is no real domain
logic — but always keep validation, authorization, and tenant scoping.

# Subscription & feature flags (design-ahead, billing deferred)

Design every feature assuming plans exist. Feature access (`can(org, 'feature')`)
and limits are validated **server-side**. No payment gateway in the MVP; model the
`entitlements` seam so adding paid tiers later is data + config, not a refactor.

# Complexity Rule (read this before abstracting)

Always choose the **simplest implementation that preserves the architectural
boundaries**.

- Do NOT create a port/adapter/use-case trio for a trivial CRUD that has no domain
  logic. An empty layer is worse than no layer.
- Introduce a port the moment there is real business logic, a second adapter, or a
  need to unit-test without the database.
- Avoid premature optimization. The architecture must enable growth, not slow MVP
  delivery.

Before adding an abstraction, ask: *does this protect a boundary that is actually
under pressure?* If not, don't.

# When generating or reviewing code

1. Put business logic in `domain`/`application`, never in `app/` or components.
2. Keep tenant isolation and server-side authorization in every command.
3. Use ports/adapters for the command side of complex domains; DTOs + Prisma for reads.
4. Strict TypeScript. Validate every input with Zod at the delivery edge.
5. Prefer the simplest solution that keeps boundaries intact.
