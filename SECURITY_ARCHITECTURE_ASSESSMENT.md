# Security & Architecture Assessment Report — BookingFlow KR

**Fecha:** 10 de junio de 2026
**Alcance:** Auditoría de solo lectura sobre el codebase completo (commit `09706ab`)
**Stack auditado:** Next.js 16 (App Router) · React 19 · Prisma · PostgreSQL · Better Auth · Tailwind
**Metodología:** Exploración exhaustiva con 3 agentes especializados (seguridad, rendimiento, arquitectura) + **verificación manual de cada hallazgo crítico contra el código fuente**. Los hallazgos cuya severidad inicial no resistió la verificación fueron reclasificados — este reporte no infla severidades.

---

## 1. Resumen ejecutivo

| Pilar | Nota | Veredicto |
|---|---|---|
| Seguridad (Zero Trust) | **B-** | Aislamiento multi-tenant sólido en lectura y en el flujo de citas; **grietas de contrato en repositorios de escritura** y superficie pública sin endurecer. |
| Rendimiento | **B** | Índices bien diseñados y `select` disciplinado, pero **N+1 real en el hot path público** y estrategia de invalidación de caché primitiva. |
| Escalabilidad arquitectónica | **B+** | Hexagonal genuina (no de cartón): dominio puro, ports/adapters reales, tests de aislamiento. **El schema NO soporta el siguiente vertical** sin refactor. |
| Producto / Innovación | — | Hay cimientos reales (teléfono E.164, historial de gasto, motor de slots) para 3 features de alto ROI con esfuerzo acotado. |

**Veredicto de production-readiness B2B:** el sistema está **por encima del promedio** de un MVP — la disciplina de capas y los tests de aislamiento multi-tenant son de nivel senior. Pero **no lo desplegaría a clientes de pago** sin cerrar primero: (1) el scoping de tenant en los repositorios de escritura, (2) el N+1 del endpoint público de disponibilidad, y (3) el endurecimiento de la superficie pública (headers de seguridad, secreto de auth de producción).

### Top 5 riesgos

1. **[S-01]** Repositorios de `staff` y `catalog` ignoran `organizationId` en `update`/`toggle` — IDOR latente a un refactor de distancia.
2. **[R-01]** N+1 (~3N queries redundantes) en el flujo público "cualquier barbero".
3. **[S-02]** `BETTER_AUTH_SECRET` es un placeholder de desarrollo; si llega a producción, todas las sesiones son falsificables.
4. **[S-03]** Sin `middleware.ts`: cero headers de seguridad (CSP, X-Frame-Options, HSTS) en una app B2B embebible.
5. **[A-02]** `Appointment.barberId` obligatorio y único + sin modelo de recursos → el vertical de uñas/spa exige migración de datos en caliente si se pospone.

---

## 2. Pilar 1 — Seguridad y vulnerabilidades (Zero Trust)

### S-01 · P1 — Repositorios de escritura sin scoping de tenant (IDOR latente, hoy mitigado)

**Archivos:**
- `modules/staff/infrastructure/prisma-staff-repository.ts:31-56`
- `modules/catalog/infrastructure/prisma-catalog-repository.ts:18-24`

**Evidencia (catalog):**
```typescript
async update(id, _organizationId, data) {
  return db.service.update({ where: { id }, data })   // ← _organizationId IGNORADO
},
async toggle(id, _organizationId, active) {
  await db.service.update({ where: { id }, data: { active } })  // ← sin tenant
},
```
El parámetro `organizationId` se recibe, se renombra a `_organizationId` (convención de "no usado") y **se descarta**. El `WHERE` final es `{ id }` a secas. Mismo patrón exacto en `update()` y `toggle()` del repositorio de barberos.

**Por qué NO es un P0 explotable hoy (verificado):** los use cases que envuelven estas escrituras (`update-barber.ts`, `toggle-barber.ts`, `update-service.ts`, `toggle-service.ts`) hacen primero:
```typescript
const existing = await repo.findById(id, organizationId)  // findFirst({ where: { id, organizationId } })
if (!existing) throw new InvalidServiceError('Servicio no encontrado.')
```
Un atacante autenticado en el tenant A que envíe el `serviceId` del tenant B recibe "no encontrado". **No hay ruta de explotación con el código actual.**

**Por qué sigue siendo crítico:**
1. **Violación del contrato de seguridad de la capa.** La regla del proyecto (y del propio `backend.md`) es: *ninguna query sin filtro de tenant*. El repositorio es la última línea de defensa y hoy es papel mojado.
2. **Patrón check-then-act (TOCTOU):** la verificación y la escritura son dos queries separadas sin transacción.
3. **Una sola omisión futura = breach cross-tenant.** Cualquier caller nuevo (un webhook, un job, otro use case) que llame `repo.update()` directamente sin replicar el check produce modificación de datos de otro tenant (precios, disponibilidad de barberos). En un B2B multi-tenant esto es fin de contrato.

**Remediación (1-2 h):** incluir el tenant en el `WHERE` de cada escritura — `db.service.update({ where: { id, organizationId }, ... })` (Prisma lo soporta con unique compound where o `updateMany` + verificación de count). Añadir test de aislamiento que falle si el `WHERE` no contiene `organizationId`, como los que ya existen para lecturas (`*.isolation.test.ts`).

---

### S-02 · P1 — Secreto de auth placeholder y credencial real de Cloudinary en `.env` local

**Archivo:** `.env` (líneas 8 y 22)

```
BETTER_AUTH_SECRET="bookingflow_dev_secret_key_change_in_prod_32chars"
CLOUDINARY_URL="cloudinary://761545778649761:lg3vEupy…@dyseed1qq"
```

**Corrección a la sospecha inicial:** se verificó con `git ls-files` y `git log --all` que **`.env` NO está trackeado ni existe en el historial de git**. No hay fuga en el repositorio — la higiene de `.gitignore` es correcta. Se reclasifica desde "P0 secretos comprometidos".

**Riesgo real restante:**
- El `BETTER_AUTH_SECRET` es una cadena predecible y autodocumentada. Si por inercia llega a producción, **cualquier persona que haya visto este archivo puede firmar tokens de sesión de cualquier usuario, incluido el super admin**.
- La credencial de Cloudinary es **real y activa** (no un placeholder): quien tenga acceso a esta máquina o a un backup del directorio puede borrar/reemplazar todos los assets de marca de todos los tenants.

**Remediación:** generar secreto de producción con `openssl rand -base64 32`, gestionarlo en el secret manager del hosting (nunca en archivo), rotar la API key de Cloudinary por precaución, y añadir un check de arranque que rechace producción con el secreto de dev (en `config/env.ts`).

---

### S-03 · P1 — Sin `middleware.ts`: superficie pública sin headers de seguridad

**Verificado:** no existe `middleware.ts` ni `src/middleware.ts`, y `next.config` no inyecta headers.

Consecuencias para un SaaS B2B con páginas públicas por tenant (`/[tenant]`):
- Sin **Content-Security-Policy** → XSS sin segunda barrera.
- Sin **X-Frame-Options / frame-ancestors** → clickjacking del flujo de reserva (un atacante puede enmarcar la página de un tenant y superponer UI).
- Sin **HSTS**, sin **Referrer-Policy**, sin **X-Content-Type-Options**.
- Tampoco hay capa global de rate limiting ni resolución/validación centralizada de tenant — cada action lo resuelve por su cuenta (consistente hoy, pero sin red de seguridad).

**Remediación (medio día):** `middleware.ts` con headers de seguridad + (opcional) rate limit grueso por IP en rutas públicas. La resolución de tenant puede quedarse donde está — `getTenantContext` con `cache()` es un patrón correcto.

---

### S-04 · P2 — Configuración de Better Auth mínima

**Archivo:** `server/auth.ts` (verificado completo)

Lo que hay es correcto pero es la configuración por defecto:
- ✅ `prismaAdapter`, sesiones de 7 días con `updateAge` de 24 h, plugin de organización con slugify saneado.
- ⚠️ Sin `trustedOrigins` explícitos → la protección CSRF de Better Auth depende del check de `Origin` contra `baseURL`; en cuanto haya subdominios por tenant o un dominio de marketing, hay que declararlos o las peticiones legítimas fallarán (y la tentación será desactivar el check).
- ⚠️ `emailAndPassword: { enabled: true }` **sin verificación de email** ni política de contraseñas → cualquiera registra cuentas con emails ajenos.
- ⚠️ Sin rate limiting específico en endpoints de auth (`/api/auth/*` queda fuera del rate limiter casero de actions) → fuerza bruta de credenciales viable.
- ⚠️ Sin configuración explícita de cookies (`secure`, `sameSite`) — los defaults de Better Auth son razonables, pero en B2B conviene fijarlos por escrito.

**Remediación:** habilitar `emailVerification`, `rateLimit` nativo de Better Auth, `trustedOrigins`, y `advanced.cookies` explícito.

---

### S-05 · P2 — Página pública de reseñas `/r/[appointmentId]` consultable sin restricción

**Archivos:** `app/r/[appointmentId]/page.tsx` → `modules/reviews/queries.ts:4-16`

```typescript
return db.appointment.findUnique({
  where:  { id: appointmentId },   // sin scoping — intencional: link público
  select: { id, status, organizationId, review, service.name, barber.{…} },
})
```

**Matiz verificado (el hallazgo inicial exageraba):** el `select` **no expone el nombre ni el teléfono del cliente** — solo servicio, barbero y estado. Y los IDs son `cuid()` (~119 bits de entropía), por lo que la enumeración por fuerza bruta es impracticable. Por eso es P2 y no P1.

**Riesgo residual:** quien posea un link de reseña (reenviado, filtrado en un chat) puede ver qué servicio y con qué barbero se atendió alguien, y la página no tiene rate limit (el action de envío sí: 5/min). Es información de bajo valor, pero en Zero Trust un recurso público debería al menos limitar lecturas por IP.

**Remediación:** rate limit de lectura por IP en la página, y considerar tokens de reseña de un solo uso con expiración en lugar del ID de la cita.

---

### S-06 · P2 — `clientIpFrom` confía en `x-forwarded-for` spoofeable

**Archivo:** `server/rate-limit.ts:93-97`

```typescript
return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
```

Detrás de Vercel/un proxy que sobreescribe el header, esto es correcto. Pero en cualquier deployment donde el header llegue del cliente (Node directo, proxy mal configurado), un atacante rota el header y **anula los límites de reserva (8/min), reseñas (5/min) y lookup de clientes (20/min)**. Además: el fallback `'unknown'` agrupa a todos los clientes sin IP en un solo bucket (DoS accidental entre ellos), y el backend in-memory por defecto no sirve para múltiples instancias serverless (cada lambda tiene su propio `Map` — los límites reales se multiplican por el número de instancias). El código ya autodetecta Vercel KV: **activarlo es requisito de producción, no opcional.**

---

### S-07 · ✅ Patrones de seguridad correctos (reconocimiento explícito)

Para calibrar el reporte — esto está bien hecho y por encima del estándar:

- **Validación Zod en el 100% de los Server Actions auditados**, con schemas estrictos (regex E.164 para teléfonos, enums para estados, límites de longitud).
- **Guards fuera del `try/catch`** (`modules/scheduling/actions.ts:162-166` lo documenta en comentario): `redirect()`/`notFound()` no se silencian. Detalle que la mayoría de equipos aprende en producción.
- **`select` explícito en todas las queries verificadas** — no se encontró ninguna ruta que devuelva hashes, tokens ni modelos Prisma completos al cliente.
- **El dominio de scheduling (el más crítico) sí filtra por tenant en todas sus escrituras** (`prisma-scheduling-repository.ts`: `where: { id, organizationId }`), con transacciones y lock para conflictos de slot.
- **Tests de aislamiento multi-tenant existentes** (`*.isolation.test.ts`) que afirman la presencia de `organizationId` en los `WHERE`.
- **Audit logging** en acciones administrativas y enmascaramiento de nombres en reseñas públicas (`maskName`).

---

## 3. Pilar 2 — Rendimiento y deuda técnica

### R-01 · P0 — N+1 en el flujo público "cualquier barbero"

**Archivo:** `modules/scheduling/actions.ts:39-62` (lectura de slots) y `:103-122` (reserva)

```typescript
const results = await Promise.all(
  activeBarbers.map((b) =>
    getAvailableSlots(repo, { organizationId, barberId: b.id, serviceId, date }),
  ),
)
```
Cada invocación de `getAvailableSlots` re-consulta internamente **servicio, estado del barbero y timezone de la organización** — datos idénticos para los N barberos. Para 10 barberos: ~30 queries extra por petición, **en el endpoint público más golpeado del producto** (cada cambio de fecha en el booking dispara esto).

El flujo de reserva (`:111-120`) es peor: itera barberos **secuencialmente** con `await` dentro del `for`, computando la disponibilidad completa de cada uno solo para comprobar un único slot.

**Impacto B2B:** la latencia del booking público escala linealmente con el tamaño del equipo del tenant. Es exactamente el tipo de degradación que el tenant grande (el que más paga) sufre primero.

**Remediación (medio día):** extraer servicio + timezone una sola vez antes del loop y pasar los datos precargados al use case (o añadir una variante `getAvailableSlotsForBarbers(barberIds[])` al port). Para la reserva: comprobar solo el slot solicitado, no la agenda completa.

### R-02 · P1 — `listReviewsByBarber` sin paginación

**Archivo:** `modules/reviews/queries.ts:66-96` — `findMany({ where: { organizationId } })` **sin `take`**, cargando todas las reseñas históricas del tenant en memoria para agruparlas en JS. A 2 años y 50 reseñas/mes son miles de filas por render. **Remediación:** `take` razonable por barbero o agregación en DB (`groupBy`).

### R-03 · P1 — Índice compuesto faltante: `Appointment(organizationId, customerId)`

**Archivo:** `prisma/schema.prisma:280-283`. Los índices existentes están bien elegidos (`[organizationId, startAt]`, `[organizationId, barberId, startAt]`, `[organizationId, status, startAt]`), pero el detalle de cliente (`modules/customers/queries.ts`) filtra por `organizationId + customerId` sin índice que lo cubra → seq scan creciente con el historial. **Remediación:** `@@index([organizationId, customerId, startAt])` (una línea + migración).

### R-04 · P1 — Estrategia de invalidación primitiva: solo `revalidatePath`, sin tags

**Verificado:** no existe ni un solo uso de `use cache`, `cacheTag`, `revalidateTag` o `updateTag` en el codebase. Toda invalidación es `revalidatePath`, y la más cara está en el hot path: cada reserva pública ejecuta `revalidatePath('/${slug}')` (`scheduling/actions.ts:133`), reconstruyendo la página pública completa (KPIs, catálogo, equipo, reseñas) **por cada cita creada**. Con 5 reservas/min en un tenant activo, la página vive permanentemente invalidada — pagando coste de SSR completo sin beneficio de caché.

Nota: la convención interna del proyecto ya prescribe cache components con tags por tenant e invalidación granular; **la convención está documentada pero no implementada**. Eso es deuda técnica con nombre y apellido.

**Remediación:** adoptar la convención ya acordada — reads cacheados con tags (`tenant:${slug}:services`, etc.) e invalidación con tag específico en cada mutación; la disponibilidad de slots (volátil) queda dinámica.

### R-05 · P2 — Menores

- **Doble `await` secuencial evitable** en guards (`getTenantContext` → `requirePermission`) en cada action: aceptable, son 2 queries con `cache()`.
- **`Buffer.from(await file.arrayBuffer())`** en uploads (`tenancy/actions.ts:52`): síncrono pero acotado a 4 MB por validación previa — OK.
- **Frontend disciplinado (verificado):** `"use client"` empujado a hojas, sin `useEffect` de data-fetching, sin librerías cliente pesadas. No se encontraron problemas de bundle relevantes.

---

## 4. Pilar 3 — Escalabilidad arquitectónica (Clean Architecture)

### Mapa actual

8 módulos (`identity`, `tenancy`, `scheduling`, `catalog`, `staff`, `reviews`, `customers`, `analytics` + `onboarding` UI-only) con `domain/ → application/ → infrastructure/ → ui/ → actions/`. **Verificado:** el dominio es puro (cero imports de Prisma/React/Next), los ports son interfaces reales con adaptadores Prisma, no hay dependencias circulares, y la dirección de dependencias se respeta. Esto no es "hexagonal de PowerPoint" — es la implementación real, con tests de dominio y de aislamiento. Es la mayor fortaleza del codebase.

### A-01 · P1 — Lógica de negocio y Prisma directo en Server Actions (bypass de la capa de aplicación)

Los actions deben ser adaptadores finos (validar → autorizar → invocar use case). Varios no lo son:

- **`modules/catalog/actions.ts:50-87`** — `reorderServiceAction` contiene el algoritmo completo de reordenamiento (fetch, swap, renumeración, `$transaction`) con `import('@/server/db')` dinámico dentro del action. Es lógica de negocio sin test posible fuera de Next.js y no reutilizable desde un futuro endpoint API o job.
- **`modules/customers/actions.ts:18-22`** — `db.customer.update` directo en el action (eso sí, correctamente scoped por `organizationId` — no es problema de seguridad, sino de capas).
- **`modules/scheduling/actions.ts:40-48, 104-109`** — la selección de barbero para "cualquier barbero" (lógica de negocio genuina: política de asignación) vive en el action con `db.barber.findMany` directo.

**Por qué importa para escalar:** cada feature transversal futura (API pública, webhooks, jobs de IA) necesitará exactamente esta lógica, y hoy está soldada al runtime de Next.js. El patrón correcto ya existe en el mismo codebase (el resto de scheduling lo hace bien) — es cuestión de consistencia, no de diseño nuevo.

### A-02 · P1 — El schema NO soporta el vertical de uñas/spa (decisión de producto urgente)

Respuesta directa a la pregunta de la auditoría: **no, la estructura actual no soporta el polimorfismo necesario, y el coste de posponer el refactor crece con cada cita en producción.**

Limitaciones verificadas en `prisma/schema.prisma`:

| Restricción actual | Lo que exige el nuevo vertical |
|---|---|
| `Appointment.barberId String` — **obligatorio, único, FK a Barber** (`:251-252`) | Citas con múltiples personas (manicurista + pedicurista) o **sin** persona asignada |
| No existe ningún modelo de recurso físico | Sillas, cabinas, camillas — el cuello de botella en uñas/spa es el recurso, no solo el staff |
| `Service.durationMin Int` fijo (`:131`) | Variantes por servicio (gel 60 min vs. semipermanente 90 min) |
| `enum ServiceCategory { corte, barba, combo, tratamiento, infantil }` — hardcoded a barbería, replicado en el schema Zod de `catalog/actions.ts:16` | Categorías por vertical o por tenant |
| Toda la nomenclatura del dominio es `Barber`/`barberId` | Genérico `staff`/`provider` |

**Refactor recomendado** (hacerlo ahora, con datasets pequeños y pocas filas que migrar):

```prisma
model Resource {              // staff | chair | room | equipment
  id, organizationId, type, name, active
}
model AppointmentResource {   // M:N — una cita consume varios recursos
  appointmentId, resourceId   @@unique([appointmentId, resourceId])
}
model ServiceVariant {        // duración/precio por variante
  serviceId, name, durationMin, priceCop
}
model ServiceCategory {       // categorías por tenant, no enum global
  organizationId, name        @@unique([organizationId, name])
}
```
Estrategia incremental viable: introducir `Resource` manteniendo `Barber` como `Resource` de tipo `staff` (migración 1:1), conservar `barberId` como columna legada durante la transición, y mover el motor de disponibilidad (`get-available-slots.ts`) a operar sobre conjuntos de recursos. La buena noticia: **como el motor de slots está en la capa de aplicación detrás de un port, el refactor del schema no toca el dominio** — la arquitectura elegida está pagando dividendos exactamente aquí.

### A-03 · P2 — Queries de lectura acopladas a Prisma (CQRS-lite consciente)

Los `*/queries.ts` importan `db` directamente sin port de lectura. Esto es una **decisión convencionada del proyecto** (CQRS-lite: escrituras por ports, lecturas directas) y es un trade-off defendible — se señala como acoplamiento consciente, no como violación. El riesgo real es de testabilidad de las vistas, no de arquitectura.

### A-04 · P2 — Componentes god

`OnboardingWizard.tsx` (489 líneas, 5 responsabilidades), `BarbersManager.tsx` (449), `BrandingSettings.tsx` (341). Mantenibilidad, no urgencia. Extraer por paso/sección cuando se toquen.

### A-05 · P2 — Infraestructura de notificaciones incompleta

`modules/scheduling/domain/whatsapp-reminder.ts` construye el texto del mensaje, pero **no existe** cliente de envío, ni job queue, ni cron, ni tracking de opt-in, ni webhooks. Es el bloqueador directo de las 3 propuestas del Pilar 4.

---

## 5. Pilar 4 — Visión de producto e innovación (IA y automatización)

Las tres propuestas se apoyan en activos **ya verificados** en el codebase: `Customer.phone` normalizado E.164, historial de visitas y gasto por cliente (`customers/queries.ts`), motor de disponibilidad determinista (`get-available-slots.ts`), ratings/reseñas por barbero, y una arquitectura de ports que permite añadir adaptadores sin tocar dominio.

### 5.1 — Relleno inteligente de horas muertas (ROI más alto, esfuerzo más bajo) · Viabilidad: ALTA

**Qué es:** un job diario que detecta los huecos de agenda de los próximos 2-3 días (el motor de slots ya los computa — solo hay que invertir la pregunta: slots libres en vez de ocupados), cruza con clientes inactivos (>30-45 días sin cita, dato ya disponible en el CRM) y dispara promociones segmentadas con descuento dinámico por hora valle.

**Por qué primero:** ataca directamente el revenue del tenant (sillas vacías = dinero quemado), es 90% lógica sobre datos existentes, y es el argumento de venta B2B más tangible ("BookingFlow me llenó los martes por la tarde").

**Plan técnico:** cron (Vercel Cron) → use case `findDeadSlots` reutilizando el port de scheduling → segmentación SQL sobre `Customer` + `Appointment` → canal de envío (dependencia: 5.2). Sin IA en v1; un LLM puede luego redactar el copy y elegir el descuento. **Esfuerzo: 1-2 sprints** una vez exista el canal de envío.

### 5.2 — Canal WhatsApp transaccional + re-engagement con IA · Viabilidad: MEDIA

**Qué es:** completar la infraestructura que hoy es solo un string builder: (a) adaptador `MessagingPort` con WhatsApp Business Cloud API o Twilio, (b) tabla `MessageLog` + opt-in/opt-out por cliente (obligatorio: la política de WhatsApp exige plantillas aprobadas y consentimiento — incumplirla = ban del número del tenant), (c) recordatorios automáticos 24 h/2 h antes (reduce no-shows, el dolor #1 medible: el sistema ya trackea `no_show` como estado), (d) fase 2: agente conversacional que reserva por chat usando los actions existentes como herramientas.

**Plan técnico:** el patrón ya existe — calcar `shared/ports/image-storage.ts` (port) + `server/cloudinary.ts` (adapter). Cola: Inngest o QStash (serverless-friendly; no Bull, que requiere proceso persistente). **Esfuerzo: 2-3 sprints.** Coste variable: ~$0.005-0.04/mensaje según país — facturable al tenant como add-on (línea de revenue nueva).

### 5.3 — Webhooks salientes por tenant (apuesta de plataforma) · Viabilidad: ALTA

**Qué es:** emitir eventos de dominio (`appointment.created/cancelled/completed`, `review.submitted`) a endpoints configurables por tenant, con firma HMAC y reintentos. Habilita Zapier/Make, sincronización con Google Calendar, contabilidad, y es el prerequisito silencioso de cualquier ecosistema de integraciones — lo que convierte un booking tool en una plataforma con switching cost real.

**Plan técnico:** modelo `WebhookEndpoint` + patrón **transactional outbox** (tabla `DomainEvent` escrita en la misma `$transaction` que la mutación — los `$transaction` ya existen en los repos; el dispatcher con backoff la drena vía cron). Esto además regala una **auditoría de eventos** interna, útil para analytics e IA futura. **Esfuerzo: 1-2 sprints.** Riesgo principal: SSRF — validar URLs de destino (bloquear IPs privadas/metadata endpoints).

**Orden recomendado:** 5.3 (outbox+webhooks, desbloquea eventos) → 5.2 (canal WhatsApp) → 5.1 (promos sobre ambos). Si solo hay capacidad para uno este trimestre: **5.1 con envío manual** (el panel sugiere a quién escribir y el tenant pulsa "enviar por WhatsApp" con deep link `wa.me` — cero infraestructura nueva, validación de mercado inmediata).

---

## 6. Matriz de remediación priorizada

| # | Prio | Hallazgo | Archivo(s) | Esfuerzo | Acción |
|---|---|---|---|---|---|
| R-01 | **P0** | N+1 en "cualquier barbero" (endpoint público) | `scheduling/actions.ts:39-62,103-122` | 0.5 d | Precargar servicio/timezone fuera del loop |
| S-01 | **P1** | Repos de escritura sin scoping de tenant | `prisma-staff-repository.ts:31-56`, `prisma-catalog-repository.ts:18-24` | 0.25 d | `organizationId` en todos los WHERE + test de aislamiento |
| S-02 | **P1** | Secreto de auth placeholder / credencial Cloudinary real local | `.env:8,22` | 0.25 d | Rotar, secret manager, guard de arranque en `config/env.ts` |
| S-03 | **P1** | Sin middleware: cero security headers | — (inexistente) | 0.5 d | `middleware.ts` con CSP, XFO, HSTS |
| R-03 | **P1** | Índice faltante org+customer en Appointment | `prisma/schema.prisma` | 0.1 d | `@@index([organizationId, customerId, startAt])` |
| R-02 | **P1** | Reseñas sin paginación | `reviews/queries.ts:66` | 0.25 d | `take` o `groupBy` en DB |
| R-04 | **P1** | Invalidación todo-o-nada con `revalidatePath` | `scheduling/actions.ts:133` y todos los actions | 1-2 d | Migrar a cache tags por tenant (convención ya acordada) |
| A-01 | **P1** | Lógica de negocio en actions | `catalog/actions.ts:50-87`, `customers/actions.ts:18-22`, `scheduling/actions.ts:40-48` | 1 d | Extraer a use cases con ports |
| A-02 | **P1** | Schema no soporta multi-recurso (uñas/spa) | `prisma/schema.prisma:241-285` | 1-2 sem | `Resource` + `AppointmentResource` + `ServiceVariant` (decisión de roadmap: antes de escalar datos) |
| S-04 | P2 | Better Auth sin hardening (email verify, rate limit, trustedOrigins) | `server/auth.ts` | 0.5 d | Config explícita |
| S-05 | P2 | Página de reseñas sin rate limit de lectura | `app/r/[appointmentId]/page.tsx` | 0.25 d | Rate limit / token de un solo uso |
| S-06 | P2 | Rate limiter: header spoofeable + in-memory multi-instancia | `server/rate-limit.ts:93-97` | 0.1 d | Activar Vercel KV en prod (ya autodetectado) |
| A-04 | P2 | Componentes god (489/449/341 líneas) | `OnboardingWizard.tsx` et al. | oportunista | Extraer al tocar |
| A-05 | P2 | Notificaciones: solo existe el string builder | `whatsapp-reminder.ts` | ver §5.2 | Port + adapter + cola |

---

## 7. Conclusión

El codebase tiene **fundamentos arquitectónicos genuinamente sólidos** — dominio puro, ports reales, tests de aislamiento multi-tenant, validación universal con Zod y guards bien colocados. Las críticas duras de este reporte son de dos tipos: **inconsistencias** (los repos de staff/catalog no cumplen el estándar que scheduling sí cumple; la convención de caché está escrita pero no implementada; tres actions se saltan la capa que el resto respeta) y **una decisión de producto impostergable** (el schema mono-vertical). Ninguna requiere reescritura — todas requieren llevar el resto del código al nivel que el propio proyecto ya demostró saber alcanzar.

**Secuencia sugerida:** semana 1 → R-01, S-01, S-02, S-03, R-03 (un sprint corto elimina todo lo rojo). Después → A-02 como decisión de roadmap antes de firmar el primer cliente de un vertical nuevo.

---
*Reporte generado por auditoría asistida de solo lectura. Cada hallazgo con archivo:línea fue verificado manualmente contra el código fuente en la fecha indicada; las severidades reflejan explotabilidad real, no patrones superficiales.*
