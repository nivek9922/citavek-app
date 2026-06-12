# Pre-Deploy Audit — Citavek

Eres un Senior Engineer con expertise en Next.js 16, arquitectura hexagonal, SaaS multi-tenant y performance en Vercel. Tu misión es auditar este repositorio antes de subir a producción.

## Contexto del proyecto

- SaaS multi-tenant B2B para negocios de citas (barberías, salones de belleza).
- Stack: Next.js 16 App Router, React 19, TypeScript estricto, Prisma + PostgreSQL (Neon), Better Auth, Tailwind, shadcn/ui, Cloudinary, Sonner.
- Arquitectura hexagonal por módulos: `domain → application → infrastructure → ui`, con `actions.ts` (write) y `queries.ts` (read) por módulo.
- Deploy en Vercel. Cada push a main va directo a producción.
- Módulo de referencia canónico: `modules/scheduling/`.

---

## Paso 1 — Cambios recientes

Ejecuta esto primero para entender el scope:

```bash
git diff HEAD~1 --name-only
git log --oneline -10
```

Lista los archivos modificados y clasifícalos por categoría:
- Nuevas features
- Correcciones de bugs
- Cambios de infraestructura / schema
- Cambios de UI
- Configuración / dependencias

---

## Paso 2 — Auditoría de arquitectura

> Aplica las reglas de @.claude/agents/architecture.md

Revisa cada archivo modificado y verifica:

### Capas
- [ ] `domain/` no importa Prisma, Next.js ni React
- [ ] `application/` no importa Prisma directamente
- [ ] `infrastructure/` es el único lugar con imports de `@/generated/prisma/client`
- [ ] `ui/` no importa desde `infrastructure/` ni `domain/` directamente
- [ ] `queries.ts` existe y está separado de `actions.ts` en módulos con lecturas
- [ ] `queries.ts` usa `'server-only'` + `'use cache'` + `cacheTag` + `cacheLife`

### Server Actions
- [ ] Guards (`getTenantContext`, `requirePermission`) están FUERA del try/catch
- [ ] Retornan `{ ok: true }` o `{ ok: false, error: string }` — nunca lanzan al cliente
- [ ] Llaman `updateTag('resource:${organizationId}')` tras mutación exitosa
- [ ] No usan `revalidatePath` (código nuevo — legacy existente se tolera)
- [ ] No contienen lógica de negocio inline (delegan al use case)

### Multi-tenant
- [ ] Toda query Prisma incluye `organizationId` en el `where`
- [ ] `organizationId` viene de `getTenantContext(slug)` — nunca del cliente
- [ ] No hay queries con `findMany` sin filtro de tenant
- [ ] El campo se llama `organizationId` — no `tenantId`, no `orgId`

---

## Paso 3 — Auditoría de seguridad

> Aplica las reglas de @.claude/agents/security.md — si hay hallazgos Critical o High, detén el audit y repórtalos antes de continuar.

Revisa los archivos modificados y detecta:

### Crítico (bloquea deploy)
- Queries Prisma sin `organizationId` en el `where`
- `organizationId` o cualquier ID sensible aceptado desde el cliente
- Server Action sin guard de autenticación/autorización
- Datos de otro tenant potencialmente expuestos
- Secrets o tokens hardcodeados o logueados

### Alto
- `findMany` sin paginación en endpoints públicos
- Uploads sin validación de tipo MIME y tamaño
- Rate limiting ausente en rutas públicas críticas (booking flow)
- `dangerouslySetInnerHTML` con contenido no sanitizado

### Medio
- Campos innecesarios expuestos en responses (over-fetching)
- Falta de `select` en queries que devuelven entidades completas

Si hay hallazgos críticos o altos: **detén el análisis y repórtalos antes de continuar.**

---

## Paso 4 — Auditoría de performance

> Aplica las reglas de @.claude/agents/backend.md para la sección de Prisma y caché.

### Next.js / Vercel
- [ ] Nuevos componentes server-side por defecto — `'use client'` solo donde es estrictamente necesario
- [ ] Imágenes usan `next/image` con `width`, `height` y `priority` en above-the-fold
- [ ] No hay imports pesados de lado del cliente que puedan estar en el servidor
- [ ] Suspense boundaries con `<Skeleton />` en componentes con fetching
- [ ] No hay waterfalls de datos innecesarios (fetches secuenciales que pueden ser paralelos)

### Prisma / Base de datos
- [ ] No hay queries N+1 (loops con queries adentro)
- [ ] `include` y `select` usados — no se trae toda la entidad cuando no se necesita
- [ ] Queries de escritura múltiple usan `$transaction` para atomicidad
- [ ] Si hay nuevas relaciones en el schema: verificar que existen los índices necesarios

### Caché
- [ ] `cacheTag` sigue la convención: `services:${orgId}`, `barbers:${orgId}`, `appointments:${orgId}`
- [ ] `updateTag` invalida exactamente las tags afectadas — ni más ni menos
- [ ] No se cachea data sensible de un tenant que otro podría ver

---

## Paso 5 — Auditoría de UI

> Aplica las reglas de @.claude/agents/frontend.md

- [ ] Todo feedback post-Server Action usa `toast.success()` / `toast.error()` de sonner — no `useState` con mensajes
- [ ] Acciones destructivas (delete, suspend, reset) tienen `<AlertDialog>` de confirmación
- [ ] No hay `<input type="date">` — solo `<DatePicker>` de `shared/ui/date-picker.tsx`
- [ ] Mutaciones con feedback visual instantáneo usan `useOptimistic` (referencia: `modules/catalog/ui/ServicesManager.tsx`)
- [ ] Estados de carga tienen `<Skeleton />` — no pantallas en blanco

---

## Paso 6 — Build check

Ejecuta y reporta el resultado completo:

```bash
npm run validate
```

Esto corre `typecheck + lint + test` en secuencia. Si cualquiera falla: **no continuar**.

Si pasa, ejecuta también:

```bash
npm run build
```

Reporta:
- Warnings de TypeScript o ESLint aunque no bloqueen
- Bundle size de rutas nuevas o modificadas (output del build)
- Cualquier error de build aunque sea en rutas no modificadas

---

## Paso 7 — Checklist de schema (solo si hay cambios en `prisma/schema.prisma`)

> Aplica las reglas de @.claude/agents/architecture.md — sección Data Integrity Patterns.

- [ ] Nuevas migraciones generadas con `npm run db:migrate`
- [ ] Migración revisada manualmente — no hay drops de columnas accidentales
- [ ] Soft-delete aplicado: entidades con historial usan `active: Boolean` o status enum — no `prisma.delete`
- [ ] Entidades 1-a-1 con Organization usan `organizationId String @unique` + `upsert`
- [ ] Prisma client regenerado: `npx prisma generate`
- [ ] Si hay nuevos índices: verificar que son los correctos para las queries que los usan

---

## Paso 8 — Reporte final

Produce un reporte estructurado con este formato:

```
## CITAVEK — Pre-Deploy Report
Fecha: [fecha]
Commit: [hash]
Archivos modificados: [N]

### 🔴 Bloqueantes (no hacer deploy)
[lista o "Ninguno"]

### 🟡 Warnings (hacer deploy con precaución)
[lista o "Ninguno"]

### 🟢 Todo correcto
[lista de checks que pasaron]

### 📋 Notas para el siguiente ciclo
[deuda técnica encontrada que no es urgente]

### ✅ Veredicto
DEPLOY APROBADO / DEPLOY BLOQUEADO
```

---

## Instrucciones de uso

- Ejecutar este prompt **antes de cada push a main**.
- Si el veredicto es BLOQUEADO: corregir los bloqueantes, volver a correr desde el Paso 6.
- Si hay warnings: documentarlos en `### Notas para el siguiente ciclo` y hacer seguimiento.
- Los hallazgos de deuda técnica acumulada van al backlog — no bloquean deploy a menos que sean seguridad o multi-tenant.