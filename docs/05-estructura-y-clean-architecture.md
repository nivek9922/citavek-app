# 05 · Estructura y Clean Architecture

> Materializa el capítulo 5 de [00 · Arquitectura](./00-arquitectura-y-vision.md).
> Define el árbol exacto de carpetas, las reglas de dependencia entre capas y un
> **slice vertical completo de ejemplo** (módulo Catalog / Service) para que el
> patrón sea concreto y replicable.

> **⚠️ Fuente autoritativa de arquitectura:** [`.claude/architecture.md`](../.claude/architecture.md).
> El proyecto adopta **arquitectura híbrida** (DDD + Clean + Hexagonal + Modular
> Monolith) con separación **comando/lectura (CQRS-lite)**:
> - **Escritura (lógica de negocio):** `Server Action → Use Case → Port → Adapter Prisma`.
> - **Lectura (read models):** `queries.ts` usa Prisma directo y devuelve DTOs.
>
> El módulo **`scheduling`** es la **implementación de referencia** del patrón completo
> (`domain/ports/`, `application/` use cases, `infrastructure/` adapter Prisma). Los CRUD
> simples (`catalog`, `staff`) usan la forma ligera. Ninguna página de `app/` accede a
> Prisma directamente: todo pasa por `queries.ts` (lecturas) o `actions.ts` (escrituras).

---

## 1. Árbol de carpetas

```
bookingflow-kr/
├── app/                          # Next.js App Router (delgado — solo routing)
│   ├── (marketing)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing del producto
│   │   └── login/page.tsx
│   ├── [tenant]/
│   │   ├── layout.tsx            # getTenantContext + theming SSR
│   │   ├── page.tsx              # Booking público
│   │   ├── not-found.tsx
│   │   └── panel/
│   │       ├── layout.tsx        # requireMembership
│   │       ├── page.tsx          # Dashboard
│   │       ├── agenda/page.tsx
│   │       ├── servicios/page.tsx
│   │       ├── equipo/page.tsx
│   │       ├── marca/page.tsx
│   │       └── clientes/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts
│       └── health/route.ts
│
├── modules/                      # Bounded contexts — cada uno es autónomo
│   ├── catalog/                  # Servicios (Catalog context)
│   │   ├── domain/
│   │   │   └── service.ts        # Entidad/VO puros — sin deps de framework
│   │   ├── application/
│   │   │   ├── create-service.ts # Use case
│   │   │   ├── update-service.ts
│   │   │   └── types.ts          # DTOs de entrada/salida
│   │   ├── infrastructure/
│   │   │   └── service-repo.ts   # Adaptador Prisma
│   │   ├── ui/
│   │   │   ├── ServiceList.tsx
│   │   │   ├── ServiceForm.tsx
│   │   │   └── hooks/
│   │   ├── actions.ts            # Server Actions (thin: valida→autoriza→use case)
│   │   ├── queries.ts            # DAL de lectura (server-only, DTOs)
│   │   └── schemas.ts            # Esquemas Zod compartidos
│   │
│   ├── staff/                    # Barberos y horarios
│   ├── scheduling/               # Citas y disponibilidad (núcleo — Clean Arch completo)
│   ├── customers/                # CRM mínimo
│   ├── analytics/                # Read-models de KPIs
│   ├── tenancy/                  # Branding / settings de la org
│   └── identity/                 # Onboarding, perfil de usuario
│
├── server/                       # Composition root (cross-cutting, server-only)
│   ├── db.ts                     # Prisma singleton
│   ├── auth.ts                   # better-auth config
│   ├── session.ts                # getSession() memoizado
│   ├── auth-guards.ts            # requireSession/Membership/Permission
│   ├── tenant.ts                 # getTenantContext()
│   └── rbac.ts                   # Mapa de permisos
│
├── shared/                       # Sin lógica de dominio — solo utils
│   ├── ui/                       # shadcn/ui + componentes base
│   │   ├── button.tsx, card.tsx, ...
│   │   └── index.ts
│   ├── color-utils.ts            # hexToOklch (port de barrio-glow-up)
│   ├── format.ts                 # formatCop, formatDate, etc.
│   └── types.ts                  # Tipos utilitarios
│
├── config/
│   ├── env.ts                    # Variables de entorno validadas con Zod
│   └── constants.ts              # Constantes de la app
│
├── generated/
│   └── prisma/                   # Cliente Prisma generado (en .gitignore)
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docs/                         # Planes de arquitectura
├── prisma.config.ts
├── .nvmrc                        # "22"
└── proxy.ts                      # (raíz del proyecto, nivel de app/)
```

---

## 2. Regla de dependencias (la única regla que no se rompe)

```
app/  →  modules/<ctx>/ui  →  modules/<ctx>/actions|queries
                            →  modules/<ctx>/application
                            →  modules/<ctx>/domain
                            →  shared/
                            ↓
                         server/  ←  solo desde application/infrastructure
                            ↓
                         generated/prisma  ←  solo desde server/ e infrastructure/
```

- `domain/` no importa nada de fuera del módulo. Sin Prisma, sin Next, sin React.
- `application/` no importa Prisma. Habla con `infrastructure/` a través de
  interfaces (puertos) definidas en `application/`.
- `ui/` no importa Prisma ni `server/` directamente. Llama `actions.ts`/`queries.ts`.
- `app/` es el router: importa `ui/`, llama `queries.ts` en Server Components.
- `server/` es el único que importa el cliente Prisma generado.

> Para los CRUDs simples (Catalog, Staff, Branding) se puede saltar la capa de
> `application/` si no hay lógica de dominio real. En ese caso el `actions.ts`
> llama directo a `infrastructure/`. La costura (interfaz) se añade cuando aparece
> la lógica que la justifica.

---

## 3. Slice vertical completo — módulo Catalog (Servicios)

Trazar todo el camino de "crear un servicio" de punta a punta.

### 3.1 Schema Zod — `modules/catalog/schemas.ts`

```ts
import { z } from 'zod'
import { ServiceCategory } from '@/generated/prisma'

export const createServiceSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  durationMin: z.number().int().min(5).max(480),
  priceCop:    z.number().int().min(0),
  category:    z.nativeEnum(ServiceCategory),
  imageUrl:    z.string().url().optional(),
  sortOrder:   z.number().int().default(0),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
```

### 3.2 Repositorio — `modules/catalog/infrastructure/service-repo.ts`

```ts
import 'server-only'
import { db } from '@/server/db'
import type { CreateServiceInput } from '../schemas'

export async function getActiveServices(organizationId: string) {
  return db.service.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, description: true,
      durationMin: true, priceCop: true, category: true, imageUrl: true,
    },
  })
}

export async function getServiceById(id: string, organizationId: string) {
  return db.service.findFirst({ where: { id, organizationId } })
}

export async function insertService(
  organizationId: string,
  input: CreateServiceInput,
) {
  return db.service.create({ data: { ...input, organizationId } })
}

export async function updateService(
  id: string,
  organizationId: string,
  input: Partial<CreateServiceInput>,
) {
  // findFirst primero para verificar ownership antes de update
  const existing = await getServiceById(id, organizationId)
  if (!existing) throw new Error('Not found')
  return db.service.update({ where: { id }, data: input })
}

export async function deactivateService(id: string, organizationId: string) {
  const existing = await getServiceById(id, organizationId)
  if (!existing) throw new Error('Not found')
  return db.service.update({ where: { id }, data: { active: false } })
}
```

### 3.3 Queries DAL — `modules/catalog/queries.ts`

```ts
import 'server-only'
import { cache } from 'react'
import { getActiveServices } from './infrastructure/service-repo'

// Memoizado por request + cacheable con use cache si se quiere persistencia.
export const listActiveServices = cache(
  async (organizationId: string) => getActiveServices(organizationId)
)
```

### 3.4 Server Actions — `modules/catalog/actions.ts`

```ts
'use server'
import { revalidateTag } from 'next/cache'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { createServiceSchema } from './schemas'
import { insertService, deactivateService } from './infrastructure/service-repo'

export async function createServiceAction(slug: string, raw: unknown) {
  const ctx   = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:create')
  const input = createServiceSchema.parse(raw)
  await insertService(ctx.id, input)
  revalidateTag(`tenant:${ctx.id}:catalog`)
}

export async function deleteServiceAction(slug: string, serviceId: string) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:delete')
  await deactivateService(serviceId, ctx.id)   // soft-delete
  revalidateTag(`tenant:${ctx.id}:catalog`)
}
```

### 3.5 Server Component en la página de admin

```tsx
// app/[tenant]/panel/servicios/page.tsx
import { getTenantContext } from '@/server/tenant'
import { listActiveServices } from '@/modules/catalog/queries'
import { ServicesManager } from '@/modules/catalog/ui/ServicesManager'

export default async function ServiciosPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx      = await getTenantContext(slug)
  const services = await listActiveServices(ctx.id)

  return <ServicesManager services={services} tenantSlug={slug} />
}
```

### 3.6 Componente de UI (Client Component para el formulario)

```tsx
// modules/catalog/ui/ServicesManager.tsx
'use client'
import { useTransition } from 'react'
import { createServiceAction } from '../actions'
// ... shadcn/ui imports

export function ServicesManager({ services, tenantSlug }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createServiceAction(tenantSlug, Object.fromEntries(formData))
    })
  }

  return (
    // ... UI con lista + formulario
  )
}
```

---

## 4. Módulo `scheduling` — donde SÍ va la Clean Architecture completa

Para los CRUDs como `catalog` o `staff` el patrón "repo + action + query" es
suficiente. El módulo `scheduling` es diferente: tiene lógica de dominio real
(cálculo de slots, reglas de transición de estado, validación de solapamiento)
que debe poder probarse **sin base de datos ni framework**.

```
modules/scheduling/
  domain/
    slot-calculator.ts     # computeAvailableSlots() — función pura, testeable
    appointment.ts         # Entidad Appointment + transiciones de estado
    appointment-errors.ts  # SlotNotAvailableError, etc.
  application/
    ports/
      appointment-repo.port.ts   # Interfaz IAppointmentRepo
    book-appointment.ts          # Use case: reservar cita
    cancel-appointment.ts        # Use case: cancelar
  infrastructure/
    appointment-repo.ts          # Implementación Prisma de IAppointmentRepo
  ui/
    BookingFlow.tsx
    ...
  actions.ts
  queries.ts
```

El detalle del algoritmo de slots está en [plan 07](./07-modulo-booking-y-disponibilidad.md).

---

## 5. `server/db.ts` — singleton de Prisma

```ts
// server/db.ts
import 'server-only'
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

Previene crear múltiples instancias en hot-reload de Next.js en desarrollo.
En producción/serverless cada invocación crea su instancia (el pooler lo maneja).

---

## 6. `config/env.ts` — variables de entorno validadas

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:           z.string().url(),
  BETTER_AUTH_SECRET:     z.string().min(32),
  NEXT_PUBLIC_APP_URL:    z.string().url(),
  NODE_ENV:               z.enum(['development', 'test', 'production']).default('development'),
  // DIRECT_URL: z.string().url().optional(),  // producción con pooler
})

export const env = envSchema.parse(process.env)
```

Si falta una variable, la app falla al arrancar con un mensaje claro —
no en runtime cuando ya hay usuarios.

---

## 7. Convenciones de naming y co-location

| Tipo | Nombre | Ejemplo |
|------|--------|---------|
| Server Action | `<verbo><Entidad>Action` | `createServiceAction` |
| Use case | `<verbo>-<entidad>.ts` | `book-appointment.ts` |
| Repo function | `<verbo><Entidad>` (camelCase) | `insertService`, `getServiceById` |
| Query DAL | `list<Entidad>s`, `get<Entidad>By...` | `listActiveServices` |
| Componente | PascalCase, co-ubicado con el módulo | `ServicesManager.tsx` |
| Schema Zod | `<acción><Entidad>Schema` | `createServiceSchema` |

**Co-ubicación**: los tests viven junto al código que prueban:
`modules/catalog/infrastructure/service-repo.test.ts`.

---

## 8. Lo que se construye en la Fase 0 (scaffolding)

Con este plan como guía, la Fase 0 del [roadmap](./01-mvp-roadmap.md) crea:

1. `server/db.ts` — singleton Prisma.
2. `config/env.ts` — validación de env.
3. `shared/color-utils.ts` — `hexToOklch`.
4. `shared/format.ts` — `formatCop`, `formatDate`.
5. Esqueleto de carpetas (`modules/`, `server/`, `shared/`, `config/`).
6. Un test de "smoke" que verifica la conexión a DB.
7. Scripts en `package.json`: `db:migrate`, `db:studio`, `db:reset`.

No se toca `app/` hasta la Fase 1.
