# Production Debug Skill

## Purpose
Investigate bugs that appear in production builds but not in development mode.

This skill is for:
- npm run build
- npm run start
- production-only bugs
- cache inconsistencies
- server action behavior differences
- rendering differences between dev and production

## Core Rule
Do not modify code before understanding the root cause.

## Investigation Goals
Identify:
- root cause
- affected files
- affected module
- rendering flow
- cache flow
- server action flow
- reproduction steps
- why it works in dev but fails in production

## Required Checks
Always compare:

### Development
- npm run dev

### Production
- npm run build
- npm run start

Investigate differences in:
- Server Components vs Client Components boundaries
- Server Actions payload mapping (ensure Prisma Models aren't leaking)
- caching (Data Cache vs Full Route Cache)
- revalidation triggers
- hydration mismatches

## Next.js 16 Focus Areas
Pay special attention to:
- `revalidatePath` and `revalidateTag` placement in Server Actions.
- Correct usage of `useOptimistic` to prevent UI staleness instead of relying on `router.refresh()`.
- Unintended caching of dynamic routes (check if `force-dynamic` or proper Next.js headers are missing).
- Suspense boundaries failing in production builds.

## Investigation Rules
- Do not guess.
- Do not refactor while investigating.
- Do not optimize before proving the problem.
- Do not add new abstractions during analysis.
- Use evidence from code and behavior.

## Output Required
Generate a report called:

PRODUCTION_BUG_ANALYSIS.md

The report must include:
- Problem summary
- Reproduction steps
- Expected behavior
- Actual behavior
- Root cause
- Evidence
- Minimal fix strategy prioritizing React 19 hooks and Cache Invalidation over full page reloads.
- Validation plan
- Risks

## Acceptance Criteria
The skill is successful only if it can:
- explain the production-only bug clearly
- identify the exact cause
- recommend the smallest correct fix conforming strictly to Clean Architecture
- avoid unrelated changes