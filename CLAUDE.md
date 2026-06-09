# Context
You are working on BookingFlow KR, a multi-tenant SaaS platform for appointment management.

## Product Vision
The platform helps businesses manage:
- appointments
- customers
- staff schedules
- subscriptions
- payments
- tenant branding
- analytics

The system must be designed to support:
- barber shops
- hair salons
- beauty salons
- future appointment-based businesses

## Stack
- Next.js 16 (App Router strictly)
- React 19
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- shadcn/ui

## Architecture Rules
The project follows:
- Modular Monolith
- Clean Architecture
- Hexagonal Architecture
- DDD-inspired module organization

### Folder/Layer Rules
- Domain: Contains business rules, entities, value objects, and ports.
- Application: Contains use cases and orchestration.
- Infrastructure: Contains Prisma, external services, and adapters.
- UI: Contains React components and presentation logic.

### Dependency Direction
Allowed:
- UI -> Application
- Application -> Domain
- Infrastructure -> Domain

Forbidden:
- Domain depending on Prisma, React, Next.js, or any external library.
- Application depending directly on Prisma (use ports/interfaces).
- UI containing business rules.
- Leaking Prisma Models to the UI. Always map DB results to Domain Entities or plain DTOs before passing them to Client Components.

## Next.js 16 & React 19 Rules
Prefer:
- Server Components by default.
- Server Actions for all mutations.
- React 19 hooks for UI state (`useOptimistic`, `useActionState`, `useFormStatus`).
- Immediate cache invalidation using `revalidatePath` or `revalidateTag` at the end of successful Server Actions.
- Suspense and streaming for parallel data fetching.

Avoid:
- Client Components (`"use client"`) unless interactivity (e.g., onClick, hooks) is strictly required. Push `"use client"` down the component tree to the leaf nodes.
- Overusing `useEffect`. State derivation and Server Actions should replace most effects.
- Passing non-serializable data from Server to Client.

## Performance Rules
Always think about:
- Rendering cost and reducing LCP (Largest Contentful Paint).
- Minimizing client JS bundle size.
- Database query efficiency (avoid N+1 queries in Prisma).
- Avoiding unnecessary re-renders.

## Testing Rules
Every important feature must include:
- Unit tests for domain and use cases.
- Integration tests for repositories and server actions.

## Working Style
Before implementing:
1. Analyze the problem.
2. Identify the root cause.
3. Propose the smallest correct solution.
4. Validate edge cases.

Do not guess. Do not over-engineer. Do not rewrite large parts without need. Do not use magic strings (e.g., "any"); use proper typing, nulls, or domain constants.