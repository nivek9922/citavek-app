<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Directory

This project uses specialized agents located in `.claude/agents/`. Each agent has a focused scope and produces a specific output. Invoke the right agent for the task.

| Agent | File | When to invoke | Output |
|---|---|---|---|
| Architecture | `architecture.md` | Module structure reviews, new module creation, dependency direction, soft-delete decisions | `ARCHITECTURE_REVIEW.md` |
| Backend | `backend.md` | Server Actions, Use Cases, repositories, Prisma queries, cache strategy, multi-tenant safety | `BACKEND_REVIEW.md` |
| Frontend | `frontend.md` | React components, RSC/Client boundary decisions, optimistic UI, forms, UX patterns | `FRONTEND_REVIEW.md` |
| Security | `security.md` | Any security concern, auth/authz review, tenant isolation audit, pre-deploy review | `SECURITY_REVIEW.md` |

---

## When to invoke multiple agents

Some tasks require more than one agent in sequence:

- **New feature end-to-end:** Architecture → Backend → Frontend → Security
- **Pre-deploy audit:** Backend + Security in parallel, then Frontend
- **New module scaffold:** Architecture first to validate structure, then Backend for the use case layer

---

## Module inventory

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

---

## Cross-cutting conventions (applies to all agents)

- Field name is **`organizationId`** — never `tenantId`, `orgId`, or any alias.
- Guards (`getTenantContext`, `requirePermission`) always go **outside** try/catch in Server Actions.
- All Server Action feedback uses **`sonner` toasts** — never inline `useState` messages.
- New cache invalidations use **`updateTag`** — never `revalidatePath`.
- Destructive UI actions always require an **`AlertDialog`** confirmation step.