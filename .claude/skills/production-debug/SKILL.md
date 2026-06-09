# Production Debug Skill

## Purpose

Investigate issues that occur in production builds but not in development mode.

Focus on identifying root causes before proposing fixes.

Never start by modifying code.

Always investigate first.

---

## Primary Scenario

The application behaves correctly during:

npm run dev

but behaves differently during:

npm run build && npm run start

---

## Investigation Workflow

### Phase 1

Understand the problem.

Document:

* Expected behavior
* Actual behavior
* Reproduction steps
* Affected pages
* Affected modules

---

### Phase 2

Compare:

Development Mode

vs

Production Mode

Identify differences in:

* Rendering
* Caching
* Routing
* Server Actions
* Suspense
* Streaming
* Revalidation

---

### Phase 3

Inspect Next.js behavior.

Review:

* Server Components
* Client Components
* Server Actions
* Route Handlers
* Cache Components
* revalidatePath
* revalidateTag
* updateTag
* refresh
* router.refresh

Determine whether behavior differs between development and production.

---

### Phase 4

Analyze data flow.

Document:

UI
→ Action
→ Use Case
→ Repository
→ Prisma
→ Database

Verify:

* Database updates
* Cache invalidation
* UI refresh behavior

---

### Phase 5

Root Cause Analysis

Produce evidence.

Never guess.

Explain:

* Why issue occurs
* Why it only occurs in production
* Which files are involved
* Which APIs are involved

---

## Output

Generate:

PRODUCTION_BUG_ANALYSIS.md

Structure:

### Problem

### Reproduction

### Root Cause

### Evidence

### Recommended Fix

### Risks

### Validation Plan

---

## Rules

Do not modify code during investigation.

Do not refactor.

Do not optimize.

Do not rewrite architecture.

Focus exclusively on identifying root cause.

Root cause must be proven before fixes are proposed.
