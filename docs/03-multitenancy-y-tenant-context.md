# 03 · Multi-tenancy y TenantContext

> Profundiza el capítulo 6 de [00 · Arquitectura](./00-arquitectura-y-vision.md).
> Define **cómo se resuelve el tenant en cada request** y cómo ese contexto
> fluye hasta repositorios, Server Actions y theming. Es el pegamento que hace
> que todo el código de dominio sea automáticamente multi-tenant.

---

## 1. El flujo completo de una request

```
Browser: GET /san-fernando-cali/
                │
                ▼
        proxy.ts  (Next.js 16)
        · ¿ruta pública de assets? → pass-through
        · (futuro) subdominio → rewrite a /[slug]/...
        · nada más: NO resuelve tenant, NO autentica
                │
                ▼
        app/[tenant]/layout.tsx
        · await params → slug = "san-fernando-cali"
        · await getTenantContext(slug)
          ├─ DB lookup (Organization por slug) — cacheado por request + cacheTag
          ├─ 404 si no existe o está suspended
          └─ devuelve TenantContext { org, branding, ... }
        · inyecta CSS vars de theming inline en <html> → sin flash
        · pasa org a children vía componentes (no React Context → SSR-safe)
                │
                ▼
        app/[tenant]/page.tsx  (booking público)
        app/[tenant]/panel/... (admin — exige sesión + membership)
```

---

## 2. `proxy.ts` — mínimo y deliberado

Next.js 16 renombró `middleware.ts` → `proxy.ts` y lo trata como "último recurso".
Nosotros lo usamos **solo** para dos cosas:

1. **Pass-through de assets** (excluir del matcher).
2. **(Futuro)** Rewrite de subdominio `san-fernando.app.com` → `/san-fernando/`.

**No** hace tenant lookup, **no** hace auth. Ambas cosas ocurren más cerca del
código que las necesita (layout y Server Actions respectivamente).

```
src/proxy.ts
```

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Fase futura: reescritura de subdominio a path.
  // const host = request.headers.get('host') ?? ''
  // const sub = resolveSubdomain(host)
  // if (sub) return NextResponse.rewrite(new URL(`/${sub}${request.nextUrl.pathname}`, request.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Excluir assets estáticos, _next y archivos con extensión
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
```

---

## 3. `getTenantContext()` — resolución en servidor

Vive en `server/tenant.ts`. Es la **única fuente de verdad** del tenant en cada request.

### Características

- Usa `cache()` de React → **una sola query por request**, sin importar cuántos
  layouts/páginas/componentes lo llamen.
- Usa `'use cache'` + `cacheTag('tenant:<id>')` para la query DB → se sirve desde
  caché entre requests. Se invalida con `revalidateTag` cuando muta el branding.
- Devuelve un **DTO** (no la entidad Prisma en crudo) → la UI solo ve lo que necesita.
- Lanza `notFound()` de Next si el slug no existe o la org está `suspended`.

```
server/tenant.ts  (server-only)
```

```ts
import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { db } from '@/server/db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  timezone: string
  currency: string
  branding: {
    primaryColor: string
    logoUrl: string | null
    tagline: string | null
    coverUrl: string | null
  }
}

// cache() de React: memoiza por request. El resultado NO se comparte entre requests.
export const getTenantContext = cache(async (slug: string): Promise<TenantContext> => {
  'use cache'
  // cacheTag('tenant:' + slug) — Next.js 16 use cache
  const org = await db.organization.findFirst({
    where: { slug, status: 'active' },
    select: {
      id: true, slug: true, name: true, timezone: true, currency: true,
      branding: {
        select: { primaryColor: true, logoUrl: true, tagline: true, coverUrl: true }
      }
    }
  })
  if (!org) notFound()
  return {
    ...org,
    branding: org.branding ?? { primaryColor: '#E0A300', logoUrl: null, tagline: null, coverUrl: null }
  }
})
```

> **Nota de invalidación**: cuando el owner actualiza el branding, la Server Action
> llama `revalidateTag('tenant:' + slug)` y la próxima visita reconstruye la caché.

---

## 4. Layout del tenant — theming SSR sin flash

```
app/[tenant]/layout.tsx
```

El layout resuelve el tenant, aplica el tema como estilos `inline` en el `<html>`
(el mismo truco que el prototipo Lovable, pero en **servidor**), y renderiza los
hijos. Sin `useEffect`, sin flash.

```tsx
import { getTenantContext } from '@/server/tenant'
import { hexToOklch } from '@/shared/color-utils'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>   // Next.js 16: params es async
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const { primary, glow } = hexToOklch(ctx.branding.primaryColor)

  const themeVars = [
    `--primary:${primary}`,
    `--primary-glow:${glow}`,
    `--ring:${primary.replace(')', ' / 60%)')}`,
    `--sidebar-primary:${primary}`,
  ].join(';')

  return (
    <html lang="es" style={themeVars as React.CSSProperties}>
      <body>{children}</body>
    </html>
  )
}
```

> `params` es `Promise<...>` en Next.js 16 — se awaita, no se desestructura en
> los argumentos directamente. Cualquier uso diferente da error de tipos.

---

## 5. Scoping de repositorios — la regla anti-IDOR

Todo acceso a datos de negocio pasa por funciones de repositorio que reciben
`organizationId` como argumento **obligatorio**. No existe acceso "global".

### Patrón base

```ts
// modules/catalog/infrastructure/service-repository.ts
import 'server-only'
import { db } from '@/server/db'

export async function getActiveServices(organizationId: string) {
  return db.service.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, durationMin: true, priceCop: true, category: true, imageUrl: true }
  })
}

// ⚠️ Nunca: db.service.findUnique({ where: { id } })
// ✅ Siempre: db.service.findFirst({ where: { id, organizationId } })
export async function getServiceById(id: string, organizationId: string) {
  return db.service.findFirst({ where: { id, organizationId } })
}
```

### Regla de naming

Toda función de repo que accede a datos del tenant recibe `organizationId` como
**primer argumento** o dentro de un objeto de contexto. Si en una revisión de
código falta ese argumento, es un bug de seguridad, no de lógica.

---

## 6. Áreas de la aplicación y estructura de rutas

```
app/
  (marketing)/              # Route group sin layout de tenant
    page.tsx                # Landing de BookingFlow (el producto)
    login/page.tsx
    register/page.tsx

  [tenant]/                 # Layout de tenant (público)
    layout.tsx              # ← getTenantContext + theming SSR
    page.tsx                # Página de reservas del cliente final
    not-found.tsx           # 404 con branding del tenant

  [tenant]/panel/           # Layout de panel (requiere auth + membership)
    layout.tsx              # ← exige sesión + rol en la org
    page.tsx                # Dashboard / agenda del día
    agenda/
    servicios/
    equipo/
    marca/
    clientes/

  api/                      # Route Handlers
    health/route.ts
    webhooks/               # (futuro: Stripe, WhatsApp)
```

### Separación marketing / tenant

`(marketing)` es un route group (paréntesis = no afecta la URL). Tiene su propio
layout sin theming dinámico. La URL `/login` y `/` (landing del producto) son
rutas del producto SaaS, no de ninguna barbería.

---

## 7. TenantContext en Server Actions — re-autorización obligatoria

Las Server Actions **no confían** en el layout ni en el proxy. Siempre re-derivan
el tenant y verifican la sesión internamente.

```ts
// modules/catalog/actions.ts
'use server'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth'

export async function createService(slug: string, input: CreateServiceInput) {
  const ctx = await getTenantContext(slug)          // 1. re-resuelve tenant
  const member = await requireMembership(ctx.id)    // 2. exige sesión + membership
  if (member.role !== 'owner') throw new Error('Forbidden')   // 3. verifica rol
  // 4. lógica de negocio
}
```

Esto implementa exactamente la advertencia de seguridad de Next.js 16: el proxy
no es suficiente para proteger Server Actions.

---

## 8. Hoja de ruta hacia subdominios y RLS

### Subdominios (Fase 2 — marketing/onboarding)

Cuando una barbería quiera su propio subdominio (`mi-barberia.bookingflow.co`),
el `proxy.ts` ya tiene el hook comentado. Solo hay que:
1. Activar el rewrite en `proxy.ts`.
2. Configurar el wildcard DNS y el certificado en Vercel.
3. El resolver de tenant NO cambia — sigue siendo por `slug`.

### RLS en Postgres (Fase 2 — defense-in-depth)

```sql
-- Por habilitar cuando migremos a Supabase o activemos RLS explícitamente.
ALTER TABLE service ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service
  USING (organization_id = current_setting('app.organization_id')::text);
```

En el MVP la protección la da el scoping en repositorios + tests de aislamiento
(ver plan 10). RLS es la segunda línea de defensa.

---

## 9. Tests de aislamiento (no negociables)

Antes de lanzar, deben existir estos tests de integración:

```ts
// tests/isolation.test.ts
it('no devuelve datos de otro tenant', async () => {
  const orgA = await createTestOrg('barberia-a')
  const orgB = await createTestOrg('barberia-b')
  const service = await createTestService(orgA.id, { name: 'Corte A' })

  // El repo de B no puede ver el servicio de A
  const result = await getServiceById(service.id, orgB.id)
  expect(result).toBeNull()
})
```

---

## 10. Resumen de archivos que crea este plan

| Archivo | Propósito |
|---------|-----------|
| `src/proxy.ts` | Proxy mínimo (ex-middleware), matcher de assets |
| `server/tenant.ts` | `getTenantContext()` — fuente de verdad del tenant |
| `server/db.ts` | Singleton del cliente Prisma |
| `shared/color-utils.ts` | `hexToOklch()` — port del prototipo |
| `app/[tenant]/layout.tsx` | Layout con theming SSR |
| `app/[tenant]/not-found.tsx` | 404 con branding |
| `app/(marketing)/page.tsx` | Landing del producto |
