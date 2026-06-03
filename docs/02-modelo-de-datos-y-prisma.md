# 02 · Modelo de datos y Prisma

> Profundiza el capítulo 7 de [00 · Arquitectura](./00-arquitectura-y-vision.md).
> Define el **schema completo**, enums, índices, constraints, convenciones de
> dinero/tiempo, integración con `better-auth`, migraciones y seed.
> Es el plan que desbloquea casi todo el código.

---

## 1. Principios del modelo de datos

1. **Multi-tenant por columna.** Toda tabla de negocio lleva `organizationId` (FK a
   `organization`), indexada y presente en **todos** los índices compuestos de consulta.
   No existe dato de negocio sin dueño.
2. **El dinero se guarda en pesos enteros COP.** `priceCop Int` + `currency` (default
   `'COP'`) a nivel de organización. Nunca `Float`/`Decimal` para evitar errores de
   redondeo. COP no usa decimales en la práctica, así que guardamos el peso entero
   exacto (ej. `25000`). _(Si en el futuro hay monedas con subunidad, se revisará la
   unidad; hoy priorizamos simplicidad.)_
3. **El tiempo es UTC + zona horaria del tenant.** Marcas de tiempo `timestamptz`
   (`@db.Timestamptz(6)`); cada `Organization` tiene `timezone` (ej. `America/Bogota`)
   para calcular slots correctamente. Los horarios de trabajo se guardan como **minutos
   desde medianoche** (enteros), no como `Date`.
4. **Snapshot en la cita.** `Appointment` **copia** `priceCents` y `durationMin` del
   servicio al momento de reservar. Si luego cambia el precio/duración del servicio, la
   cita conserva lo pactado. (Error clásico que evitamos.)
5. **No se borra lo que tiene historia.** Servicios y barberos referenciados por citas
   no se eliminan: se desactivan (`active = false`). FKs con `onDelete: Restrict`.
6. **Auth lo gobierna `better-auth`.** Las tablas de identidad/organización las **genera
   su CLI**; nosotros solo las extendemos con `additionalFields` y añadimos el dominio.

---

## 2. Integración con `better-auth` (fuente de verdad de identidad)

`better-auth` + plugin `organization` generan estas tablas vía
`npx @better-auth/cli generate` (detalle de configuración en [plan 04](./04-auth-y-rbac.md)):

| Tabla (generada) | Rol en nuestro dominio |
|------------------|------------------------|
| `user` | Cuenta de login (owner, barbero, futuro super-admin) |
| `session` | Sesión; lleva `activeOrganizationId` (barbería activa) |
| `account` | Credenciales/OAuth |
| `verification` | Tokens de verificación |
| **`organization`** | **= Tenant = Barbería.** Raíz de aislamiento |
| `member` | Usuario ↔ organización **con rol** (owner/barber/…) |
| `invitation` | Invitaciones a unirse a una barbería |

> **Workflow para evitar drift:** se configura `better-auth` (con `additionalFields`
> de `organization` y los roles del access-control) → se corre el CLI → escribe las
> tablas de auth en `schema.prisma` → nosotros añadimos los modelos de dominio en el
> mismo archivo → `prisma migrate`. **No editamos a mano las columnas base de auth.**

### `Organization` extendida (auth base + `additionalFields` nuestros)

```prisma
// Generada por better-auth; las columnas marcadas (+) son additionalFields nuestros.
model Organization {
  id        String   @id
  name      String
  slug      String   @unique           // /[tenant] → "san-fernando-cali"
  logo      String?                     // (auth) opcional; el branding rico va en Branding
  metadata  String?                     // (auth) JSON libre
  createdAt DateTime @default(now())

  // (+) additionalFields de dominio
  city      String?
  address   String?
  phone     String?
  timezone  String   @default("America/Bogota")
  currency  String   @default("COP")
  status    OrganizationStatus @default(active)

  // Relaciones de dominio
  branding     Branding?
  services     Service[]
  barbers      Barber[]
  customers    Customer[]
  appointments Appointment[]
  members      Member[]

  @@index([status])
  @@map("organization")
}
```

---

## 3. Modelos de dominio (autoría nuestra)

### 3.1 Branding (marca blanca, 1:1 con la organización)

```prisma
model Branding {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  primaryColor String   @default("#E0A300")  // hex; se deriva a OKLCH en runtime
  logoUrl      String?
  tagline      String?
  coverUrl     String?

  updatedAt    DateTime @updatedAt

  @@map("branding")
}
```

> Cluster cohesivo que se edita junto en la pantalla "Marca". Mantiene `organization`
> liviana. Reemplaza el `TenantBranding` del prototipo.

### 3.2 Service (Catálogo)

```prisma
model Service {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name        String
  description String?
  durationMin Int                          // duración en minutos
  priceCop    Int                          // COP en pesos enteros (ej. 25000)
  category    ServiceCategory
  imageUrl    String?
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  appointments Appointment[]

  @@index([organizationId, active, sortOrder])
  @@map("service")
}
```

### 3.3 Barber (Equipo) — perfil propiedad de la barbería, con login opcional

```prisma
model Barber {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Costura: enlaza a una cuenta de login para que el barbero vea su agenda.
  // Nullable en MVP (un barbero puede existir como perfil sin login).
  userId       String?

  displayName  String
  nickname     String?
  avatarUrl    String?
  specialties  String[]                    // array nativo Postgres
  rating       Float    @default(0)        // métrica de presentación (no dinero)
  reviewsCount Int      @default(0)
  active       Boolean  @default(true)
  sortOrder    Int      @default(0)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  workingHours WorkingHour[]
  appointments Appointment[]

  @@index([organizationId, active, sortOrder])
  @@index([userId])
  @@map("barber")
}
```

### 3.4 WorkingHour (horarios de trabajo del barbero)

```prisma
model WorkingHour {
  id        String @id @default(cuid())
  barberId  String
  barber    Barber @relation(fields: [barberId], references: [id], onDelete: Cascade)

  dayOfWeek Int    // 0 = domingo … 6 = sábado
  startMin  Int    // minutos desde medianoche (ej. 09:00 → 540)
  endMin    Int    // (ej. 20:00 → 1200)

  @@index([barberId, dayOfWeek])
  @@map("working_hour")
}
```

> **Minutos como enteros** simplifican el cálculo de slots y la aritmética horaria.
> **Múltiples intervalos por día** (ej. con pausa de almuerzo) se modelan con **varias
> filas** del mismo `dayOfWeek` — sin coste extra de schema. Vacaciones/ausencias
> puntuales (`TimeOff`) se posponen a una fase futura.

### 3.5 Customer (CRM mínimo)

```prisma
model Customer {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name      String
  phone     String                          // E.164 normalizado, ej. +573104567890
  email     String?
  notes     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  appointments Appointment[]

  @@unique([organizationId, phone])         // un cliente por teléfono dentro de la barbería
  @@index([organizationId, name])
  @@map("customer")
}
```

> Al reservar se hace **upsert por `(organizationId, phone)`**: el cliente final no
> inicia sesión en el MVP, pero su historial se acumula por teléfono.

### 3.6 Appointment (núcleo de Scheduling)

```prisma
model Appointment {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  serviceId  String
  service    Service  @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  barberId   String
  barber     Barber   @relation(fields: [barberId], references: [id], onDelete: Restrict)
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

  // Snapshot del cliente (resiliente aunque se borre el Customer)
  customerName  String
  customerPhone String

  startAt     DateTime @db.Timestamptz(6)    // UTC
  endAt       DateTime @db.Timestamptz(6)    // UTC (= startAt + durationMin)
  durationMin Int                            // snapshot
  priceCop    Int                            // snapshot (pesos enteros COP)

  status  AppointmentStatus  @default(confirmed)
  source  AppointmentSource  @default(online)
  notes   String?

  createdByUserId String?                    // quién la creó (alta manual en panel)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  cancelledAt DateTime?

  @@index([organizationId, startAt])
  @@index([organizationId, barberId, startAt])
  @@index([organizationId, status, startAt])
  @@map("appointment")
}
```

---

## 4. Enums

```prisma
enum OrganizationStatus {
  active
  suspended            // impago/baja: bloquea panel y reservas
}

enum ServiceCategory {
  corte
  barba
  combo
  tratamiento
  infantil
}

enum AppointmentStatus {
  pending              // reservada, aún sin confirmar (futuro: requiere depósito)
  confirmed            // confirmada
  completed            // atendida (cuenta para ingresos)
  cancelled            // cancelada
  no_show              // el cliente no llegó
}

enum AppointmentSource {
  online               // la creó el cliente desde /[tenant]
  manual               // la creó el staff desde el panel
}
```

> **Roles** (`owner`, `barber`, …) **no** son un enum de Prisma: los gobierna el
> access-control de `better-auth` y se guardan como string en `member.role`. Se definen
> en el [plan 04](./04-auth-y-rbac.md). `ServiceCategory` se deja como enum por
> simplicidad del MVP; si una barbería pide categorías propias, migra a tabla `Category`.

---

## 5. Diagrama entidad-relación (MVP)

```
        ┌──────────────┐         ┌─────────────┐
        │     User     │────────<│   Member    │>────────┐
        │  (better-auth)│         │ role:string │         │
        └──────────────┘         └─────────────┘         │
                                                          ▼
                                              ┌────────────────────────┐
                              ┌──────────────<│      Organization       │  (= Tenant)
                              │               │  slug, timezone, status │
                ┌─────────────┤               └────────────────────────┘
                │             │                 │      │      │      │
                ▼             ▼                 ▼      ▼      ▼      ▼
          ┌──────────┐  ┌──────────┐    ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
          │ Branding │  │ Service  │    │  Barber  │ │Customer│ │Appointmnt│ │   ...    │
          │  (1:1)   │  └────┬─────┘    └────┬─────┘ └───┬────┘ └────┬─────┘
          └──────────┘       │               │           │           │
                             │               ▼           │           │
                             │        ┌──────────────┐   │           │
                             │        │ WorkingHour  │   │           │
                             │        └──────────────┘   │           │
                             └───────────────┬───────────┴───────────┘
                                             ▼
                                   Appointment >── Service, Barber, Customer
                                   (snapshot de precio/duración/cliente)
```

---

## 6. Índices y constraints

### Unicidad
- `organization.slug` único global.
- `customer (organizationId, phone)` único.
- `branding.organizationId` único (1:1).

### Índices de consulta (pensados para miles de tenants)
- `appointment (organizationId, startAt)` — agenda por rango.
- `appointment (organizationId, barberId, startAt)` — disponibilidad por barbero.
- `appointment (organizationId, status, startAt)` — KPIs/filtrado por estado.
- `service (organizationId, active, sortOrder)` · `barber (organizationId, active, sortOrder)`.
- `working_hour (barberId, dayOfWeek)`.

### Prevención de doble reserva (defensa en dos niveles)
1. **Aplicación (baseline):** la creación de cita ocurre dentro de una **transacción**
   que recomprueba que el slot sigue libre para ese barbero (solape contra citas activas).
2. **Base de datos (robusto, recomendado):** **exclusion constraint** sobre un rango
   `tstzrange(startAt, endAt)` por `barberId`, que la BD rechaza si hay solape. Prisma
   no lo expresa nativamente → se añade en una **migración SQL manual**:

```sql
-- migración manual tras prisma migrate
ALTER TABLE appointment ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('pending','confirmed','completed'));
-- requiere: CREATE EXTENSION IF NOT EXISTS btree_gist;
```

> Con el constraint, una carrera entre dos reservas simultáneas del mismo hueco la
> resuelve Postgres (una falla limpia), no la suerte.

---

## 7. Convenciones de dinero y tiempo (detalle)

### Dinero
- **Decisión:** guardar `priceCop: Int` en **pesos enteros COP** (ej. `25000`). COP no
  usa subunidad en la práctica → cero ambigüedad y aritmética entera exacta.
- Formateo en UI con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP',
  maximumFractionDigits: 0 })`. Helper único en `shared/format.ts` (port de `formatCop`).
- `Organization.currency` queda como columna (default `COP`) por si el producto sale de
  Colombia; ese día se revisa la unidad de almacenamiento.

### Tiempo
- DB: `@db.Timestamptz(6)` (UTC). App: nunca `new Date()` "local" para lógica de slots.
- `Organization.timezone` (IANA) gobierna la conversión a hora local de la barbería.
- Cálculo de slots **en servidor** con utilidades de TZ centralizadas (lib `date-fns-tz`
  o `Temporal` si está disponible). Detalle en [plan 07](./07-modulo-booking-y-disponibilidad.md).
- `WorkingHour` en minutos locales de la barbería; se combinan con la fecha + timezone
  para producir instantes UTC.

---

## 8. Modelos diferidos (billing) — solo costura, no se implementan en MVP

Se documentan para fijar la forma; **no entran al schema del MVP** (o entran inertes):

```prisma
// FUTURO — no migrar en MVP
// model Plan {
//   id           String  @id @default(cuid())
//   key          String  @unique        // "beta" | "basic" | "pro"
//   name         String
//   entitlements Json                    // { maxBarbers, onlineBooking, customDomain, ... }
// }
// model Subscription {
//   id             String  @id @default(cuid())
//   organizationId String  @unique
//   planKey        String
//   status         String                // trialing | active | past_due | canceled
//   currentPeriodEnd DateTime?
// }
```

En el MVP toda barbería opera con un plan implícito **"beta"** resuelto en código
(módulo `entitlements`, [plan 09](./09-suscripciones-y-entitlements.md)), sin tablas.

---

## 9. Prisma: configuración y conexión (Vercel + Postgres gestionado)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // conexión POOLED (pgbouncer/Neon) para la app
  directUrl = env("DIRECT_URL")     // conexión DIRECTA para migraciones
}
```

- **Singleton del cliente** en `server/db.ts` para no agotar conexiones en dev (hot
  reload) ni en serverless.
- **Pooling obligatorio** en Vercel: `DATABASE_URL` apunta al pooler (Neon serverless /
  Supabase pooler / pgbouncer `?pgbouncer=true`); `DIRECT_URL` para `prisma migrate`.
- El detalle de pooling/observabilidad vive en [plan 10](./10-observabilidad-testing-ci-deploy.md).
- `.env` validado con zod en `config/env.ts` (falla rápido si falta una variable).

---

## 10. Migraciones y seed

### Migraciones
- Flujo: `prisma migrate dev` en local; `prisma migrate deploy` en CI/CD.
- Migraciones SQL manuales (exclusion constraint, `btree_gist`) versionadas junto a las
  generadas.
- Nunca editar una migración ya aplicada; siempre una nueva.

### Seed (demo / desarrollo)
- `prisma/seed.ts` que **porta los datos mock** de `barrio-glow-up/src/features/tenant/
  mockData.ts`: 2–3 barberías (San Fernando Cali, Envigado Cuts, Chapinero Shave) con
  sus servicios, barberos, horarios y citas de ejemplo.
- Sirve para: desarrollo local, e2e de Playwright y demos de venta.
- Idempotente (upsert por slug / claves naturales).

---

## 11. Reglas multi-tenant a nivel de datos (invariantes)

1. Toda query de dominio incluye `where: { organizationId }` — garantizado porque los
   repos reciben `TenantContext` (no hay acceso a Prisma "crudo" desde la UI).
2. Ningún `findUnique` por `id` sin verificar también `organizationId` (evita IDOR entre
   tenants). Patrón: `findFirst({ where: { id, organizationId } })`.
3. RLS de Postgres como backstop se evalúa en [plan 03](./03-multitenancy-y-tenant-context.md)
   (Fase 2). El MVP se apoya en el scoping de repos + tests de aislamiento.

---

## 12. Decisiones tomadas (con justificación) y puntos a confirmar

**Confirmadas:**
- Dinero en **pesos enteros COP** (`priceCop Int`). _(2026-06-03)_
- `timezone` con **default fijo `America/Bogota`** (editable más adelante). _(2026-06-03)_
- `Barber.rating`/`reviewsCount` **se mantienen** como campos de presentación
  alimentados por seed (fidelidad con el prototipo); sistema de reseñas real, futuro. _(2026-06-03)_
- `Branding` en **tabla 1:1** separada (no `additionalFields`) → cluster cohesivo.
- `Barber.userId` **opcional** desde ya → costura para que el barbero tenga login.
- `WorkingHour` en **minutos enteros** + múltiples filas por día → cálculo simple, pausas
  gratis.
- **Exclusion constraint** anti-solape vía migración SQL → robustez real ante carreras.
- `ServiceCategory` como **enum** (no tabla) en MVP.

**Decisión de implementación incremental (para ver crecer la DB en TablePlus):**
- **Migración 1 (ahora):** dominio + `Organization` raíz (Branding, Service, Barber,
  WorkingHour, Customer, Appointment + enums). `Barber.userId` queda como columna sin FK.
- **Migración 2 ([plan 04](./04-auth-y-rbac.md)):** tablas de `better-auth`
  (`user/session/account/verification/member/invitation`), que conectan
  `Member → Organization` y `Barber.userId → User`.
- **Migración 3:** exclusion constraint anti-solape (`btree_gist`) sobre `appointment`.

---

## 13. Qué desbloquea este plan

Con el schema cerrado, los siguientes planes pueden bajar a implementación:
`03` (TenantContext + scoping de repos sobre estas tablas), `04` (config de
`better-auth` + roles), `05` (slice vertical: p. ej. crear servicio de punta a punta),
`07` (slots sobre `WorkingHour`/`Appointment`).
