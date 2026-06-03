# 04 · Auth y RBAC

> Define la configuración de `better-auth`, la estructura de organizations
> (tenant ↔ usuario ↔ rol), los permisos y cómo se protegen rutas y
> Server Actions. Profundiza el capítulo 8 de [00 · Arquitectura](./00-arquitectura-y-vision.md).

---

## 1. Por qué `better-auth`

- **Organizations plugin nativo**: crea `organization`, `member`, `invitation` con
  lógica de membresía ya resuelta — no hay que inventar multi-tenancy en auth.
- **Adaptador Prisma**: genera las tablas y las mantiene en nuestro schema.
- **Access control plugin**: roles y permisos declarativos, sin boilerplate.
- **Self-hosted**: datos en nuestra DB, sin proveedor externo.
- **TS-first**: tipos derivados del schema de `better-auth` → cero casting.

---

## 2. Tablas que genera `better-auth` (Migración 2)

El CLI de `better-auth` añade estas tablas a `prisma/schema.prisma`:

| Tabla | Propósito |
|-------|-----------|
| `user` | Cuenta de usuario (email, nombre, avatar) |
| `session` | Sesión activa; lleva `activeOrganizationId` |
| `account` | Credenciales OAuth / email-password |
| `verification` | Tokens email/magic-link |
| `organization` | **Ya existe** — `better-auth` la extiende con sus columnas |
| `member` | Usuario ↔ organización con `role: string` |
| `invitation` | Invitaciones a unirse a una barbería |

La columna `organization.slug` **ya existe** en nuestro schema; `better-auth`
la respeta (es un campo estándar del plugin). Las columnas de dominio que
añadimos (`city`, `timezone`, etc.) también se respetan.

La FK que faltaba:

```prisma
// Se añade en la migración 2, cuando exista la tabla user.
model Barber {
  // ...
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## 3. Roles del MVP

Los roles se definen en el access-control de `better-auth` y se almacenan como
`string` en `member.role`. Empezamos con 2 roles activos:

| Rol | Quién | Puede |
|-----|-------|-------|
| `owner` | Dueño/administrador de la barbería | Todo: branding, equipo, servicios, agenda, ver ingresos |
| `barber` | Barbero con cuenta | Ver y gestionar su propia agenda |

**Futuro** (sin código ahora): `manager`, `receptionist`, `superadmin`.

---

## 4. Mapa de permisos (coarse → fino)

Definimos los permisos como **constantes** desde el día 1 para migrar a
granularidad fina sin refactor. Cada permiso es un string `recurso:acción`.

```ts
// server/rbac.ts
export const permissions = {
  // Catálogo
  'service:create':  ['owner'],
  'service:update':  ['owner'],
  'service:delete':  ['owner'],
  'service:read':    ['owner', 'barber'],

  // Equipo
  'barber:create':   ['owner'],
  'barber:update':   ['owner'],
  'barber:delete':   ['owner'],
  'barber:read':     ['owner', 'barber'],

  // Citas
  'appointment:create':  ['owner', 'barber'],
  'appointment:update':  ['owner', 'barber'],
  'appointment:cancel':  ['owner', 'barber'],
  'appointment:read:all': ['owner'],
  'appointment:read:own': ['barber'],   // solo las suyas

  // Branding / Settings
  'branding:update': ['owner'],
  'settings:update': ['owner'],

  // Analítica
  'analytics:revenue': ['owner'],
  'analytics:agenda':  ['owner', 'barber'],
} as const satisfies Record<string, string[]>

export type Permission = keyof typeof permissions
```

---

## 5. `server/auth.ts` — configuración de `better-auth`

```ts
// server/auth.ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { accessControl } from 'better-auth/plugins/access-control'
import { db } from '@/server/db'
import { permissions } from '@/server/rbac'

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),

  emailAndPassword: { enabled: true },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      // slug generado automáticamente desde el nombre, editable después
      slugify: (name: string) =>
        name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }),
    accessControl({ permissions }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,      // renueva si quedan < 6 días
  },

  user: {
    additionalFields: {
      // espacio para campos futuros (superadmin flag, etc.)
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session['user']
```

---

## 6. Route Handler de auth

`better-auth` expone todos sus endpoints vía un Route Handler:

```
app/api/auth/[...all]/route.ts
```

```ts
import { auth } from '@/server/auth'
import type { NextRequest } from 'next/server'

export const GET  = (req: NextRequest) => auth.handler(req)
export const POST = (req: NextRequest) => auth.handler(req)
```

Esto habilita automáticamente:
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-out`
- `GET  /api/auth/session`
- `POST /api/auth/organization/create`
- `POST /api/auth/organization/invite-member`
- … y todos los endpoints del plugin organizations.

---

## 7. Helpers de servidor — sesión y autorización

```ts
// server/session.ts
import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/server/auth'

// Memoizado por request — igual que getTenantContext
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})
```

```ts
// server/auth-guards.ts
import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { db } from '@/server/db'
import type { Permission } from '@/server/rbac'
import { permissions } from '@/server/rbac'

// Exige sesión activa; redirige a login si no hay.
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// Exige que el usuario sea miembro de la organización con el permiso dado.
// Usada en Server Actions y layouts de /panel.
export async function requirePermission(
  organizationId: string,
  permission: Permission,
) {
  const session = await requireSession()
  const member = await db.member.findFirst({
    where: { organizationId, userId: session.user.id },
  })
  if (!member) redirect('/login')

  const allowed = permissions[permission]
  if (!allowed.includes(member.role)) {
    throw new Error(`Forbidden: requires ${permission}`)
  }
  return { session, member }
}

// Versión sin permiso específico — solo verifica membresía.
export async function requireMembership(organizationId: string) {
  const session = await requireSession()
  const member = await db.member.findFirst({
    where: { organizationId, userId: session.user.id },
  })
  if (!member) redirect('/login')
  return { session, member }
}
```

---

## 8. Protección del layout de `/panel`

```tsx
// app/[tenant]/panel/layout.tsx
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  // Lanza redirect('/login') si no hay sesión o no es miembro
  const { member } = await requireMembership(ctx.id)

  return (
    <div data-role={member.role}>
      {children}
    </div>
  )
}
```

---

## 9. Server Action protegida — patrón completo

```ts
// modules/catalog/actions.ts
'use server'
import { revalidateTag } from 'next/cache'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { db } from '@/server/db'
import { createServiceSchema } from './schemas'

export async function createService(slug: string, formData: unknown) {
  // 1. Resolver tenant
  const ctx = await getTenantContext(slug)

  // 2. Autorizar (sesión + rol)
  await requirePermission(ctx.id, 'service:create')

  // 3. Validar input con Zod
  const input = createServiceSchema.parse(formData)

  // 4. Persistir (organizationId inyectado siempre)
  await db.service.create({
    data: { ...input, organizationId: ctx.id }
  })

  // 5. Invalidar caché
  revalidateTag('tenant:' + ctx.id + ':catalog')
}
```

Cada acción repite los pasos 1–2 sin excepción. No existe "confiar en el layout".

---

## 10. Cliente de `better-auth` (para componentes de cliente)

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient()],
})

export const {
  useSession,
  signIn,
  signOut,
  organization,
} = authClient
```

Usado en componentes `'use client'` para login, logout y gestión de membresías
desde el navegador.

---

## 11. Migración 2 — cómo ejecutarla

```bash
# 1. Instalar better-auth
npm install better-auth

# 2. Generar las tablas de auth en schema.prisma
npx @better-auth/cli generate

# 3. Añadir la FK barber.userId → user.id manualmente en el schema

# 4. Aplicar migración
npx prisma migrate dev --name add_auth
```

> El CLI de `better-auth` lee la config en `server/auth.ts` y añade los modelos
> al `schema.prisma` existente. Los modelos de dominio que ya están no se tocan.

---

## 12. Resumen de archivos que crea este plan

| Archivo | Propósito |
|---------|-----------|
| `server/auth.ts` | Config `better-auth` (organizations + access-control) |
| `server/rbac.ts` | Mapa de permisos por rol |
| `server/session.ts` | `getSession()` memoizado por request |
| `server/auth-guards.ts` | `requireSession`, `requireMembership`, `requirePermission` |
| `lib/auth-client.ts` | Cliente para componentes de navegador |
| `app/api/auth/[...all]/route.ts` | Route Handler de `better-auth` |
| `app/[tenant]/panel/layout.tsx` | Layout protegido con `requireMembership` |
