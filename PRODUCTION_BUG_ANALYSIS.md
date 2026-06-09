# Production Bug Analysis

**Date:** 2026-06-05  
**Branch:** main  
**Next.js version:** 16.2.7  
**Scope:** Admin UI — barbershop creation, suspension, deletion  
**Status:** Investigation only. No fixes applied.

---

## Executive Summary

All reported production bugs share a single root cause: a recent refactor replaced `useTransition` / `startTransition` with manual `useState` + `setIsPending` in three client components. When a server action is wrapped in `startTransition`, React executes the action and applies the RSC response (embedded by `revalidatePath`) within a single coherent concurrent transition. When the action is called from a plain `async` handler with manual `setIsPending` calls outside any transition, the synchronous state updates race with the internal transition that Next.js's `callServer` creates, causing the RSC response to be dropped in production's concurrent rendering mode. In development, React dev mode's more eager re-rendering and the absence of the Full Route Cache mask this problem entirely.

> **Evidence base:** `git diff HEAD`, Next.js 16 source at `node_modules/next/dist/`, and confirmed against session memory `feedback-revalidate-vs-refresh.md` (verified 2026-06-05 against `action-handler.js:874` and `server-action-reducer.js`).

---

## The Mechanism That Was Broken

### How `revalidatePath` + `useTransition` was supposed to work

When a server action is called inside `startTransition`, the full execution chain is:

```
startTransition(async () => {
    await setOrgStatusAction(...)          // 1. client calls server
})
  │
  ▼  server side
revalidatePath('/admin')                   // 2. sets pathWasRevalidated = ActionDidRevalidateStaticAndDynamic
  │
  │  action-handler.js:901
  │  skipPageRendering ||= (pathWasRevalidated === undefined || pathWasRevalidated === ActionDidNotRevalidate)
  │  → skipPageRendering = false           // 3. RSC will be re-rendered
  │
  ▼  action-handler.js finally block
await executeRevalidates(workStore)        // 4. flush incremental cache invalidations
render AdminPage with fresh Prisma data   // 5. new RSC payload produced
  │
  ▼  HTTP response
flightData = <fresh RSC for /admin>        // 6. embedded in action response
  │
  ▼  client side: server-action-reducer.js
serverActionReducer receives flightData
revalidationKind = ActionDidRevalidateStaticAndDynamic
invalidateEntirePrefetchCache(...)         // 7. clears stale client-side Router Cache
navigateToKnownRoute(state, redirectUrl, redirectSeed, ...)  // 8. applies fresh RSC to React tree
  │
  ▼  React concurrent transition
Parent Server Component re-renders with updated org list     // 9. UI updates ✅
startTransition `isPending` = false                          // 10. all within the same transition
```

This entire chain — steps 1–10 — runs **within a single React concurrent transition** when `startTransition` is used. React can safely schedule and batch all the resulting state changes (the router update from step 8 and the `isPending` flip from step 10) together. The UI transitions cleanly from "loading" to "updated".

### How the refactor broke this

The refactor changed all three components from:

```typescript
// BEFORE — working
const [isPending, startTransition] = useTransition()

function toggle() {
  const next = status === 'active' ? 'suspended' : 'active'
  startTransition(async () => { await setOrgStatusAction(orgId, next) })
}
```

to:

```typescript
// AFTER — broken in production
const [isPending, setIsPending] = useState(false)

async function toggle() {
  setIsPending(true)                             // ← synchronous, outside any transition
  try {
    const res = await setOrgStatusAction(...)    // ← callServer dispatches via its OWN startTransition
    if (!res.ok) setError(res.error)
  } finally {
    setIsPending(false)                          // ← synchronous, outside any transition
  }
}
```

`callServer` (Next.js's internal server action dispatcher) wraps the action in its own `startTransition`:

```javascript
// node_modules/next/dist/client/app-call-server.js:14-26
async function callServer(actionId, actionArgs) {
    return new Promise((resolve, reject) => {
        startTransition(() => {
            dispatchAppRouterAction({ type: ACTION_SERVER_ACTION, actionId, actionArgs, resolve, reject })
        })
    })
}
```

This creates a **second transition** that is separate from the `setIsPending(true)` / `setIsPending(false)` state updates. Now there are competing update paths:

| Timeline | Event | Transition context |
|---|---|---|
| t=0 | `setIsPending(true)` called | Synchronous state update — **outside** any transition |
| t=0 | React flushes the `isPending=true` re-render | Committed immediately |
| t=0 | `callServer` called → `startTransition(() => { dispatchAppRouterAction(...) })` | **New internal transition** starts |
| t=N | Server action completes, `flightData` (RSC) arrives | Internal transition has the RSC payload |
| t=N | `serverActionReducer` → `navigateToKnownRoute` tries to apply RSC | Inside internal transition |
| t=N | `setIsPending(false)` fires in `finally` block | **Outside** any transition — synchronous |

The problem: `setIsPending(false)` is a synchronous high-priority state update occurring in the same microtask tick as `navigateToKnownRoute`. In React 19's concurrent rendering mode (which is only fully active in production builds), a high-priority synchronous update can **preempt and discard** a lower-priority transition update. The router's transition applying the RSC payload gets cancelled or overridden by the eager `setIsPending(false)` flush.

In development (`next dev`):
- React dev mode adds extra rendering passes and applies more conservative scheduling — the RSC transition is less likely to be dropped.
- More importantly, dev mode never caches pages: the Next.js docs state *"In Development, Pages are always rendered on-demand and are never cached."* Even if the RSC update is dropped, the very next navigation re-executes the Server Component with fresh data.
- Result: bugs are invisible in dev.

In production (`next build && npm start`):
- Full React 19 concurrent mode with production scheduling heuristics.
- `setIsPending(false)` — a synchronous `useState` update — fires at high priority and preempts the lower-priority transition carrying the RSC payload.
- The RSC response is discarded. The Router Cache is not updated. The DOM stays stale.
- Result: list doesn't update, stale props remain, UI behaves inconsistently.

---

## Git Evidence

### `modules/identity/ui/CreateBarberiaForm.tsx`

```diff
-import { useState, useTransition } from 'react'
-import { useRouter } from 'next/navigation'
+import { useState } from 'react'

-  const router = useRouter()
-  const [isPending, startTransition] = useTransition()
+  const [isPending, setIsPending] = useState(false)

-  function handleSubmit(e) {
+  async function handleSubmit(e) {
     e.preventDefault()
+    setIsPending(true)
-    startTransition(async () => {
+    try {
       const res = await createBarberiaAction(input)
       if (!res.ok) { setError(res.error); return }
       setSuccess(...)
-      router.refresh()           // ← already identified as causing double-navigation
       ...
-    })
+    } finally {
+      setIsPending(false)
+    }
```

Three simultaneous changes:
1. `useTransition` → `useState(false)` — **breaks the concurrent transition chain** ❌
2. `router.refresh()` removed — correct (would cause double-navigation) ✅
3. `revalidatePath('/admin')` added to the server action — correct ✅

The correct removal of `router.refresh()` is negated by the incorrect removal of `useTransition`.

### `modules/tenancy/ui/OrgStatusToggle.tsx`

```diff
-import { useTransition } from 'react'
+import { useState } from 'react'

-  const [isPending, startTransition] = useTransition()
+  const [isPending, setIsPending] = useState(false)
+  const [error, setError]         = useState<string | null>(null)

-  function toggle() {
-    const next = status === 'active' ? 'suspended' : 'active'
-    startTransition(async () => { await setOrgStatusAction(orgId, next) })
-  }
+  async function toggle() {
+    setError(null)
+    setIsPending(true)
+    try {
+      const next = status === 'active' ? 'suspended' : 'active'
+      const res  = await setOrgStatusAction(orgId, next)
+      if (!res.ok) setError(res.error)
+    } finally {
+      setIsPending(false)
+    }
+  }
```

The refactor also added error display (the `error` state and its `<span>`). This is a useful improvement. But the `useTransition` → `useState` swap breaks the RSC application.

### `modules/tenancy/ui/OrgDeleteButton.tsx`

```diff
-import { useState, useTransition } from 'react'
+import { useState } from 'react'

-  const [isPending, startTransition] = useTransition()
+  const [isPending, setIsPending] = useState(false)

-  function handleDelete() {
+  async function handleDelete() {
     if (!matches) return
     setError(null)
-    startTransition(async () => {
+    setIsPending(true)
+    try {
       const res = await deleteOrgAction(orgId)
       if (!res.ok) { setError(res.error); return }
       setOpen(false)
-    })
+    } finally {
+      setIsPending(false)
+    }
```

Same pattern. The `useTransition` removal is the bug.

---

## Why `router.refresh()` is NOT the Fix

`router.refresh()` from the client was correctly removed in the refactor. Adding it back would cause the double-navigation problem identified in session memory:

1. **First**: action RSC response → `serverActionReducer` → `navigateToKnownRoute` (router state update A)
2. **Second**: `router.refresh()` → `refreshReducer` → `invalidateSegmentCacheEntries` (deletes what just arrived) → triggers a new server fetch

This produces non-deterministic behavior in production: sometimes update A arrives before the invalidation (list updates), sometimes after (list stays stale, then flickers on the second fetch). This was the original production bug that led to the "fix attempt" which introduced the current bugs.

The correct chain is `revalidatePath` in the server action (already present) + `startTransition` wrapping the action call in the client component (what was removed).

---

## Why `revalidatePath('/admin')` is NOT a No-Op

An earlier draft of this analysis incorrectly claimed `revalidatePath('/admin')` has no effect because `/admin` is dynamic. This is wrong.

`revalidatePath` has two effects regardless of route type:

1. **Server side**: sets `store.pendingRevalidatedTags` with the path's soft tag. Causes `skipPageRendering = false` → the page RSC IS re-rendered fresh from Prisma and embedded in the action response.
2. **Client side**: `serverActionReducer` sees `revalidationKind = ActionDidRevalidateStaticAndDynamic` → calls `invalidateEntirePrefetchCache` (clears Router Cache) → calls `navigateToKnownRoute` with the fresh RSC.

The issue is not that `revalidatePath` doesn't work. The issue is that the RSC response (`flightData`) produced by `revalidatePath` never gets properly applied to the React tree because the `useTransition` wrapper that would guarantee its processing was removed.

---

## `refresh()` from `next/cache` — Available Alternative

Next.js 16 exports a `refresh()` function from `next/cache` specifically for dynamic routes:

```typescript
// node_modules/next/dist/server/web/spec-extension/revalidate.js:65-79
function refresh() {
    // sets pathWasRevalidated = ActionDidRevalidateDynamicOnly
    // Triggers RSC re-render without invalidating the static cache
}
```

The docs describe it as: *"This refreshes the client router, ensuring the UI reflects the latest state. The `refresh()` function does not revalidate tagged data."*

For the `/admin` route (dynamic, no Data Cache entries), `refresh()` and `revalidatePath('/admin')` produce the same observable result. The current code using `revalidatePath` is not wrong — the `useTransition` removal is what broke the chain.

---

## Dev vs Production Comparison

| Behavior | `npm run dev` | `npm run build && npm start` |
|---|---|---|
| React rendering mode | Dev mode (extra passes, conservative scheduling) | Full concurrent mode, production scheduling |
| Server Component caching | None — always re-executes on navigation | Router Cache (30 s TTL for dynamic routes) |
| `setIsPending(false)` priority vs RSC transition | Dev mode is lenient — transition often survives | High-priority sync update preempts RSC transition |
| Result after action fires | UI updates (dev leniency + no cache) ✅ | RSC transition dropped, DOM stays stale ❌ |
| Result after hard reload | Fresh data ✅ | Fresh data ✅ |

---

## Symptom Mapping

| Reported Symptom | Cause |
|---|---|
| Newly created barbershops do not appear immediately | `createBarberiaAction` RSC response dropped because `handleSubmit` is outside `startTransition`; `setIsPending(false)` preempts the transition |
| List updates only after a full page reload | Hard reload bypasses React's concurrent scheduler entirely; Server Component re-executes on a fresh request |
| Suspend actions behave inconsistently | `setIsPending(false)` preempts `navigateToKnownRoute` non-deterministically; the `status` prop from the initial render is never refreshed; sometimes the RSC arrives before the preemption (updates) and sometimes after (stays stale) |
| Delete actions behave inconsistently | Same; additionally, `setOpen(false)` fires while the RSC transition may or may not complete, so the row may or may not disappear |
| Multiple records update unexpectedly | When the RSC eventually does apply (e.g., on navigation back after Router Cache TTL expires), all accumulated server-side changes become visible simultaneously |

---

## Affected Modules

| File | Change in refactor | Impact |
|---|---|---|
| [modules/identity/ui/CreateBarberiaForm.tsx:10-50](modules/identity/ui/CreateBarberiaForm.tsx#L10-L50) | `useTransition` → `useState` | List never updates after creation |
| [modules/tenancy/ui/OrgStatusToggle.tsx:9-25](modules/tenancy/ui/OrgStatusToggle.tsx#L9-L25) | `useTransition` → `useState` | Status toggle non-deterministic; stale `status` prop persists |
| [modules/tenancy/ui/OrgDeleteButton.tsx:14-45](modules/tenancy/ui/OrgDeleteButton.tsx#L14-L45) | `useTransition` → `useState` | Row persists after deletion; stale data in modal props |
| [modules/identity/actions.ts:93-125](modules/identity/actions.ts#L93-L125) | Added `revalidatePath('/admin')` + moved `requireSuperAdmin` outside try | Correct changes — the server action is now properly structured |
| [modules/tenancy/actions.ts:64-84](modules/tenancy/actions.ts#L64-L84) | Moved `requireSuperAdmin` outside try | Correct change per `feedback-server-action-guards.md` |

---

## What Is NOT a Bug

- **`revalidatePath('/admin')` in the server actions** — correctly embeds RSC in the response. Not a no-op.
- **`requireSuperAdmin()` outside `try`** — correct. Prevents `redirect()` from being silenced by catch.
- **No `router.refresh()` in client components** — correct. Adding it back would cause double-navigation.
- **`dynamicParams = true` on `[tenant]/layout.tsx`** — new tenants render dynamically as intended.
- **React `cache()` on `getSession`, `getTenantContext`** — per-request deduplication, unrelated to this bug.
- **New `error` state + display in `OrgStatusToggle`** — correct UX improvement, kept in the fix.
