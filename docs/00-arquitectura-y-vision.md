# 00 · Arquitectura y visión

> Documento ancla. Define **a dónde vamos** y **cómo está organizado el sistema**.
> Los planes 02–11 desarrollan capítulos concretos de éste.

---

## 1. Visión

Construir la plataforma SaaS de gestión y reservas para barberías más simple de
adoptar en Colombia, y la más sólida de operar a escala. Una barbería se registra,
configura su marca, su equipo y sus servicios en minutos, y obtiene una página de
reservas pública y un panel de gestión. La plataforma nace **multi-tenant** y
**modular**, de modo que crecer en clientes (miles de barberías) y en funcionalidades
(pagos, IA, multi-sede, notificaciones) sea cuestión de **añadir**, no de **reescribir**.

### Principios rectores (en orden de prioridad)

1. **Simplicidad para lanzar rápido.** El MVP debe poder construirse y venderse pronto.
   No se introduce complejidad que el MVP no necesite (sí se dejan las *costuras* para
   ella). Clean Architecture se aplica **donde aporta** (el núcleo de agendamiento),
   no como dogma en cada CRUD.
2. **Escalabilidad para crecer.** Cada decisión deja una *costura* (interfaz/puerto)
   para escalar: facturación, dominios propios, RLS, IA.
3. **Multi-tenant real.** El aislamiento de datos por tenant es invariante del sistema,
   verificado en la capa de datos, no opcional ni "por convención".
4. **Mantenibilidad.** Un solo desarrollador (tú) debe poder dar soporte y añadir
   features sin pelear con el framework. Código que se lee como el código vecino.
5. **Excelente UX.** Dark-first, responsive, theming por barbería, estados de
   carga/vacío/error cuidados, primera pintura correcta (sin "flash" de tema).

---

## 2. Glosario y modelo mental

- **Tenant = Organización = Barbería.** Una `Organization` en `better-auth`. Es la
  unidad de aislamiento. Todo dato de negocio le pertenece (`organizationId`).
- **Member.** Relación usuario ↔ organización **con un rol**. Un usuario puede
  pertenecer a varias barberías.
- **Cliente final (Customer).** Quien reserva un corte. En el MVP **no inicia sesión**;
  se captura nombre + teléfono al reservar.
- **Slug.** Identificador en URL de la barbería: `/[tenant]` → `/san-fernando-cali`.

---

## 3. Bounded contexts (DDD)

Dividimos el dominio en contextos con fronteras claras. En el MVP solo se implementan
los marcados como **activos**; el resto existe como frontera reservada.

| Contexto | Responsabilidad | MVP |
|----------|-----------------|-----|
| **Identity & Access** | Usuarios, sesiones, organizaciones, membresías, roles | ✅ Activo |
| **Tenancy** | Barbería como tenant: datos, branding, settings, zona horaria | ✅ Activo |
| **Catalog** | Servicios (nombre, duración, precio, categoría) | ✅ Activo |
| **Staff** | Barberos: perfil, especialidades, horarios de trabajo | ✅ Activo |
| **Scheduling** | Citas, disponibilidad/slots, transiciones de estado | ✅ Activo (núcleo) |
| **Customers (CRM)** | Clientes finales e historial | ✅ Mínimo |
| **Analytics** | KPIs, ingresos, ocupación (read-models sobre Scheduling) | ✅ Básico |
| **Billing & Subscriptions** | Planes, suscripción, entitlements/feature-gating | ⏸️ Modelado, sin pasarela |
| **Notifications** | Recordatorios WhatsApp/SMS/email | 🔜 Futuro |
| **Platform Admin** | Super-admin: gestionar tenants, planes, impersonación | 🔜 Futuro |
| **AI** | Asistentes y predicción sobre la capa de aplicación | 🔜 Futuro |

> **Regla de oro de fronteras:** un contexto **no** importa entidades internas de otro.
> Se comunican por sus *use cases* (capa de aplicación) o por IDs + DTOs. Ej.: Scheduling
> conoce el `serviceId` y pide a Catalog un DTO, no toca las tablas de Catalog.

---

## 4. Stack y por qué (anclado a Next.js 16)

> ⚠️ Este Next.js 16 trae cambios de ruptura frente a versiones anteriores. Las
> decisiones de abajo están verificadas contra `node_modules/next/dist/docs/`.

| Capa | Elección | Justificación |
|------|----------|---------------|
| Framework | **Next.js 16 (App Router)** | RSC + Server Actions + caché declarativa. Render del tema en servidor. |
| UI | **React 19, Tailwind 4, shadcn/ui** | Tokens `@theme`, componentes propios (no dependencia pesada), accesibles. |
| Lenguaje | **TypeScript estricto** | `strict: true`, sin `any` implícito, `noUncheckedIndexedAccess`. |
| DB | **PostgreSQL** (Neon/Supabase) | Relacional, índices compuestos, listo para RLS futura. |
| ORM | **Prisma** | Migraciones, tipado, mappers a dominio. Pooling vía driver serverless. |
| Auth | **better-auth** | Organizations + roles nativos = tenant/RBAC sin reinventar. Datos propios. |
| Validación | **Zod** | Esquemas en el borde (Server Actions, Route Handlers) y como fuente de tipos. |
| Hosting | **Vercel** + Postgres gestionado | Soporte nativo de `proxy`, caché e ISR de Next 16. |
| Tests | **Vitest** (unit/integration) + **Playwright** (e2e) | Dominio puro testeable; e2e del flujo de reserva. |

### Cambios de Next.js 16 que condicionan la arquitectura

1. **`middleware.ts` → `proxy.ts`** (runtime Node por defecto; Next lo considera
   "último recurso"). Lo usamos **mínimamente**: normalizar host/redirección base y, a
   futuro, reescritura subdominio→`/[tenant]`. La lógica de tenant/autorización **no**
   vive aquí.
2. **Data Access Layer (DAL)** es el patrón recomendado para proyectos nuevos:
   funciones `server-only`, cacheadas con `cache()`/`use cache`, que **autorizan** y
   devuelven **DTOs**. Es nuestra capa de lectura (mapea 1:1 a "queries" por módulo).
3. **Server Actions = POST a la ruta.** La autorización se valida **dentro de cada
   action** (no basta el `proxy`). Toda mutación re-deriva `TenantContext` y rol.
4. **Caché declarativa**: `use cache` + `cacheTag('tenant:<id>')` para config/catálogo;
   `revalidateTag` tras mutaciones. La disponibilidad/citas se sirve **dinámica**.
5. **`params`, `cookies`, `headers` son async** — se esperan con `await`.

---

## 5. Clean Architecture (pragmática) y estructura

Organizamos **por bounded context (feature)**, y dentro de cada uno por **capas**. La
regla de dependencias apunta siempre hacia adentro: `presentation → application →
domain`, e `infrastructure` implementa puertos de `application`.

```
┌─────────────────────────────────────────────────────────────┐
│ app/                  Routing Next (delgado): layouts, pages, │
│                       route handlers. Solo orquesta.          │
├─────────────────────────────────────────────────────────────┤
│ modules/<context>/                                            │
│   domain/             Entidades, value objects, lógica pura.  │  ← sin deps de framework
│   application/        Use cases + PUERTOS (interfaces) + DTOs.│  ← depende solo de domain
│   infrastructure/     Repos Prisma (adapters) + mappers.      │  ← implementa puertos
│   ui/                 Componentes y hooks del contexto.       │
│   actions.ts          Server Actions (mutaciones): valida →   │
│                       autoriza → use case → revalida.         │
│   queries.ts          DAL de lectura (server-only, DTOs).     │
├─────────────────────────────────────────────────────────────┤
│ server/  (composition root + cross-cutting)                   │
│   db.ts      Prisma singleton (+ pooling serverless)          │
│   auth.ts    better-auth                                      │
│   tenant.ts  resolver + getTenantContext() (cache por request)│
│   rbac.ts    permisos/roles                                   │
│   cache.ts   helpers de cacheTag/revalidate por tenant        │
├─────────────────────────────────────────────────────────────┤
│ shared/    ui (shadcn), utils, tipos comunes, formato (COP)   │
│ config/    env (validado con zod), constantes, entitlements   │
└─────────────────────────────────────────────────────────────┘
```

### Dónde SÍ y dónde NO aplicar la ceremonia completa

- **SÍ ports/adapters + dominio rico:** `Scheduling` (disponibilidad, reglas de cita).
  Es el corazón, cambia y necesita tests unitarios sin DB.
- **Ligero (repo directo + zod + DTO):** CRUDs de `Catalog`, `Staff`, branding. No
  inventamos puertos para un upsert trivial. La *costura* sigue ahí (todo pasa por
  `queries.ts`/`actions.ts`), pero sin capas vacías.

> Esto materializa la prioridad #1 (simplicidad) sin renunciar a la #4 (mantenibilidad).

---

## 6. Estrategia multi-tenant

### 6.1 Aislamiento de datos

- **Modelo:** una sola base Postgres, **esquema compartido** con columna
  `organizationId` (indexada) en **toda** tabla de negocio. Es el modelo más simple de
  operar y el que mejor escala a miles de tenants en serverless.
- **Defensa en profundidad (MVP):** *ningún* repositorio expone una query sin
  `organizationId`. Los repos reciben `TenantContext` y lo inyectan en cada `where`.
  No existe "query global" para datos de tenant.
- **Backstop (Fase 2):** **Row-Level Security (RLS)** en Postgres como red de seguridad,
  especialmente atractivo si adoptamos Supabase. Se documenta en el plan 03; no es
  bloqueante para el MVP porque el scoping a nivel de repo ya garantiza el aislamiento.

### 6.2 Resolución de tenant

```
Request /[tenant]/...           proxy.ts (mínimo)
   │                              · normaliza host, redirección base
   ▼                              · (futuro) subdominio → rewrite a /[tenant]
app/[tenant]/layout.tsx
   │  await params → slug
   ▼
server/tenant.ts → getTenantContext(slug)   ← cache() por request
   │  · busca Organization por slug (DAL, use cache + tag tenant:<id>)
   │  · 404 si no existe / inactiva
   │  · adjunta membership+rol si hay sesión (para área admin)
   ▼
{ organizationId, slug, branding, timezone, role? }  ──► disponible para
                                                          queries, actions y theming SSR
```

- `getTenantContext()` se memoiza con `cache()` de React → una sola resolución por
  request, compartida por layout, página, DAL y theming.
- **Las Server Actions vuelven a derivar el contexto y re-autorizan** (no confían en el
  layout ni en el `proxy`), según la nota de seguridad de Next 16.

### 6.3 Áreas de la app

```
app/
  [tenant]/                 # Página pública de reservas (SIN auth)
    page.tsx                #   hero + booking flow
    reservar/...            #   pasos del flujo si se hacen rutas
  [tenant]/panel/           # Panel admin/staff (CON auth + rol)
    layout.tsx              #   exige sesión + membership del tenant
    page.tsx, agenda/, equipo/, servicios/, marca/
  (marketing)/              # Landing del producto (BookingFlow), pricing, login
  api/                      # Route Handlers (webhooks, health, futuras integraciones)
```

---

## 7. Modelo de dominio (visión; detalle en plan 02)

```
User ─┬─< Member >─┬─ Organization (tenant)
      │            │     ├─< Service
      │            │     ├─< Barber ─< WorkingHour
      │            │     ├─< Customer
      │            │     └─< Appointment >─ Service, Barber, Customer
      └─ (puede pertenecer a varias organizaciones con distinto rol)
```

**Entidades MVP:** `Organization`, `User`, `Member` (better-auth), `Service`, `Barber`,
`WorkingHour`, `Customer`, `Appointment`. **Diferidas:** `Plan`, `Subscription`.

### Convenciones no negociables (errores típicos que evitamos del prototipo)

- **Dinero:** entero en **unidades menores** + `currency` (`'COP'`). Nunca `float`.
  (COP se muestra sin decimales; guardamos el entero exacto.)
- **Tiempo:** `timestamptz` en **UTC** + `timezone` por organización (ej.
  `America/Bogota`). El cálculo de slots es **timezone-correct en servidor** — el
  prototipo usaba `Date` local del navegador, inviable para multi-tenant/SSR.
- **Estados de cita:** `pending | confirmed | completed | cancelled | no_show`
  (enum en DB). Transiciones validadas en el dominio.
- **IDs:** `cuid2`/`uuid`. Slugs únicos por plataforma.
- **Índices:** `(organizationId, startAt)`, `(organizationId, barberId, startAt)`,
  `(organizationId, slug)` y FKs. Pensado para miles de tenants.

---

## 8. Roles y permisos (RBAC)

Apoyado en el plugin de organizations de `better-auth`.

| Rol | Ámbito | MVP | Puede |
|-----|--------|-----|-------|
| `superadmin` | Plataforma | 🔜 | Gestionar tenants y planes (futuro) |
| `owner` | Barbería | ✅ | Todo dentro de su barbería: branding, equipo, servicios, agenda |
| `barber` | Barbería | ✅ | Ver/gestionar su propia agenda y citas |
| `receptionist` | Barbería | 🔜 | Gestionar agenda de todos sin tocar branding/facturación |
| `manager` | Barbería | 🔜 | Como owner salvo facturación |

- **El booking público no requiere rol** (cliente final anónimo en el MVP).
- Empezamos con permisos **por rol (coarse)**, pero definimos un **mapa de permisos**
  (`canManageStaff`, `canEditBranding`, `canViewRevenue`, …) para migrar a permisos
  finos sin refactor. La autorización vive en la capa de aplicación y se **re-verifica
  en cada Server Action**.

---

## 9. Theming dinámico / marca blanca

- Cada `Organization` define `primaryColor` (hex), `logoUrl`, `tagline`, `coverUrl`.
- Reutilizamos el algoritmo **hex → OKLCH** del prototipo (`colorUtils`) para derivar
  `--primary` y `--primary-glow` con buena luminancia.
- **Mejora senior sobre el prototipo:** el tema se resuelve **en el servidor** (en el
  layout `[tenant]`) y se inyecta como variables CSS *inline* en el primer render →
  **sin flash** de color por `useEffect` de cliente.
- Tailwind 4 `@theme` mantiene los tokens base (dark-first); solo se sobreescriben por
  tenant `--primary`, `--primary-glow`, `--ring`, `--sidebar-primary`.

---

## 10. Suscripciones y entitlements (modelado, billing diferido)

> Decisión: **sin pasarela de pago en el MVP.** Modelamos el andamiaje para no
> bloquear el futuro (pagos online, depósito de reserva, planes pagos).

- `Plan` con `entitlements`: flags + límites
  (`maxBarbers`, `maxServices`, `onlineBookingEnabled`, `customDomain`,
  `advancedAnalytics`, `aiEnabled`, …).
- Módulo `entitlements`: `can(org, 'feature')` y `limit(org, 'maxBarbers')`. En el MVP
  toda barbería está en un plan implícito **"beta"** con límites generosos.
- Puerto `BillingProvider` con implementación `NoopBillingProvider` hasta Fase 2.
- **Caminos futuros previstos:** (a) suscripción SaaS de la barbería; (b) depósito de
  reserva / prepago del cliente final (transferencia o pasarela local: Wompi/Bold/
  MercadoPago) como modelo de negocio para barberías con mucha demanda.

---

## 11. Estrategia de caché (Next.js 16)

| Dato | Estrategia | Invalidación |
|------|-----------|--------------|
| Organization/branding, catálogo, equipo | `use cache` + `cacheTag('tenant:<id>')` | `revalidateTag` en la action que muta |
| Disponibilidad / slots | **Dinámico** (sin caché) | n/a (cambia constantemente) |
| Citas / agenda | Dinámico o caché muy corta por tenant+día | `revalidateTag('tenant:<id>:agenda:<fecha>')` |

Regla Next 16: leer `cookies()`/`headers()` **fuera** de los scopes `use cache` y pasar
los valores como argumentos.

---

## 12. Preparación para IA

La Clean Architecture + DAL ya deja la *costura*: la IA consume **use cases**, nunca la
DB directamente. Ganchos previstos:

- **Asistente de reservas por WhatsApp** (Claude) → llama a los use cases de Scheduling.
- **Predicción de no-show** y **forecasting de demanda** → datos ya estructurados;
  añadimos un *event log* del ciclo de vida de la cita para futuro ML.
- **Pricing dinámico / recomendación de horarios.**

Módulo `ai/` reservado + "API de aplicación" estable como único punto de entrada. Al
construirlo, usar los modelos Claude más recientes.

---

## 13. Atributos no funcionales (escala a miles de barberías)

- **Pooling de conexiones** obligatorio en serverless (driver serverless de Neon /
  pgbouncer / Prisma Accelerate). Se detalla en el plan 10.
- **Paginación** en toda lista que pueda crecer (citas, clientes).
- **Observabilidad:** logging estructurado + Sentry + métricas básicas.
- **Testing:** dominio (Vitest) → repos contra DB de test → e2e del flujo de reserva
  (Playwright). CI con typecheck + lint + test en cada PR.
- **Seguridad:** validación zod en todo borde; autorización en aplicación y re-check en
  actions; secretos en env validado; CSP y headers de seguridad.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Fuga de datos entre tenants | Scoping forzado en repos + RLS en Fase 2 + tests de aislamiento |
| Doble reserva (race) | Cálculo de slots en servidor + verificación transaccional + constraint de solape |
| Zonas horarias mal manejadas | UTC en DB + `timezone` por org + utilidades centralizadas |
| Sobre-ingeniería que retrasa el MVP | Clean Arch solo en el núcleo; CRUDs ligeros |
| Acoplarse a un proveedor | Puertos para Billing/Notifications/Storage |

---

## 15. Qué NO está en este documento (se detalla en planes posteriores)

Schema Prisma exacto (02), mecánica de `proxy.ts`/RLS (03), setup de `better-auth` y
mapa de permisos (04), esqueleto de carpetas con un slice vertical de ejemplo (05),
pipeline de theming SSR (06), algoritmo de slots y casos borde (07).
