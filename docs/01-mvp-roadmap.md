# 01 · Roadmap del MVP

> Aterriza la [visión](./00-arquitectura-y-vision.md) en un alcance concreto y un orden
> de construcción. Objetivo: **lanzar y vender pronto** sin comprometer el crecimiento.

---

## 1. Objetivo del MVP

> Una barbería puede registrarse, configurar su marca, equipo y servicios, y recibir
> reservas online desde su propia página `/[barbería]`, gestionando la agenda desde un
> panel. Todo multi-tenant, en COP, con horarios correctos.

**Una frase de venta:** *"Tu barbería con reservas online y panel de gestión en 10
minutos, con tu marca."*

---

## 2. Criterios de éxito (Definition of Done del MVP)

- [ ] Un `owner` se registra y crea su barbería (organización) con su slug.
- [ ] Configura branding (color, logo, tagline) y lo ve reflejado **sin flash** en su
      página pública.
- [ ] Da de alta servicios (precio COP, duración) y barberos (con horarios).
- [ ] Un cliente final entra a `/[barbería]`, reserva en ≤ 1 min (servicio → barbero →
      fecha/hora → confirmar) y ve confirmación.
- [ ] Los **slots ofrecidos son correctos**: respetan horario del barbero, duración del
      servicio, citas existentes y zona horaria; sin doble reserva.
- [ ] El `owner`/`barber` ve la agenda del día, marca citas (confirmar/completar/
      cancelar/no-show) y crea citas manuales.
- [ ] KPIs básicos del día/semana en el panel.
- [ ] **Aislamiento entre barberías garantizado** (test que lo demuestra).
- [ ] Responsive y desplegado en Vercel + Postgres gestionado.

**Fuera del DoD del MVP:** pagos, notificaciones, subdominios/dominios propios, cuentas
de cliente final, multi-sede, analítica avanzada, IA.

---

## 3. Alcance

### ✅ Dentro

| Área | Incluye |
|------|---------|
| Tenancy | Resolver path-based `/[tenant]`, layout de tenant, theming SSR, zona horaria/COP |
| Auth | `better-auth`, organizations, roles `owner`/`barber`, login, protección de `/panel` |
| Onboarding | Registro de barbería + primer owner; elegir slug |
| Catálogo | CRUD de servicios (precio, duración, categoría, activo) |
| Equipo | CRUD de barberos + horarios de trabajo (`WorkingHour`) |
| Marca | White-label: color (hex→OKLCH), logo, tagline |
| Reserva pública | Flujo 4 pasos, cálculo de disponibilidad en servidor, captura de cliente |
| Agenda admin | Tablero del día, transiciones de estado, alta manual de cita |
| Analítica | KPIs: ingresos hoy/semana, pendientes hoy, top barbero |
| CRM mínimo | `Customer` creado/derivado al reservar (nombre + teléfono) |
| Plataforma | DB compartida + `organizationId`, índices, seed/demo, deploy |

### ❌ Fuera (fases futuras)

Pagos/billing · depósito de reserva · notificaciones WhatsApp/SMS/email · subdominios y
dominios propios · login de cliente final + reseñas · multi-sede · analítica avanzada ·
features de IA · RLS · audit log · impersonación de super-admin.

---

## 4. Fases de construcción

> Cada fase es entregable y deja la app en verde (typecheck + tests). El **código no
> empieza** hasta cerrar los planes 02–05.

### Fase 0 — Fundaciones (esqueleto y herramientas)
- TS estricto, ESLint/Prettier, Vitest, Playwright, scripts.
- Prisma + conexión a Postgres (Neon/Supabase), `.env` validado con zod.
- shadcn/ui + tokens de diseño (port del design system dark-first del prototipo).
- Esqueleto de carpetas (`modules/`, `server/`, `shared/`, `config/`) — plan 05.
- CI: typecheck + lint + test.
- **Entregable:** repo que compila, con `/` (landing placeholder) y DB conectada.

### Fase 1 — Tenancy + Auth
- Schema base: `Organization`, `User`, `Member`, branding, timezone (plan 02).
- `better-auth` + organizations + roles (plan 04).
- `proxy.ts` mínimo + `getTenantContext()` + layout `[tenant]` (plan 03).
- Theming SSR (plan 06).
- Onboarding: crear barbería + owner; elegir slug.
- **Entregable:** registro → barbería con su slug, panel protegido, página pública con
  su tema.

### Fase 2 — Catálogo + Equipo
- `Service` y `Barber` + `WorkingHour`; CRUDs (actions + queries + UI).
- White-label settings (marca) conectado a datos reales.
- **Entregable:** owner configura servicios, barberos, horarios y marca.

### Fase 3 — Núcleo de reservas
- Dominio `Scheduling`: `computeAvailableSlots(...)` puro + tests (plan 07).
- `Appointment` + `Customer`; flujo de reserva público (port del UX Lovable a RSC +
  Server Actions).
- Verificación anti-doble-reserva (transaccional).
- **Entregable:** cliente reserva online de punta a punta.

### Fase 4 — Agenda admin + KPIs
- Tablero de agenda del día; transiciones de estado; alta manual de cita.
- Read-models de analítica (KPIs) — plan 08.
- **Entregable:** panel operativo del día a día.

### Fase 5 — Pulido + deploy
- QA responsive; estados loading/vacío/error; seed/demo con 2–3 barberías.
- Observabilidad básica (Sentry/logs), headers de seguridad.
- Deploy a Vercel + Postgres gestionado; pooling de conexiones (plan 10).
- **Entregable:** MVP en producción, listo para demos de venta.

---

## 5. Mapa de dependencias entre fases

```
Fase 0 ─► Fase 1 ─► Fase 2 ─► Fase 3 ─► Fase 4 ─► Fase 5
 (base)   (tenant   (config)  (reservas (operación (producción)
           + auth)             núcleo)   diaria)
```

`Scheduling` (Fase 3) depende de `WorkingHour` (Fase 2) y `TenantContext` (Fase 1).

---

## 6. Próximos planes a escribir (cascada)

En cuanto aprobemos este roadmap, el siguiente plan a redactar es el **02 · Modelo de
datos y Prisma**, porque casi todo lo demás depende del schema. Orden sugerido:

1. **02 · Modelo de datos y Prisma** — schema, enums, índices, dinero/tiempo, seed.
2. **03 · Multi-tenancy y TenantContext** — resolver, `proxy.ts`, scoping, RLS roadmap.
3. **04 · Auth y RBAC** — `better-auth`, organizations, permisos, protección.
4. **05 · Estructura y Clean Architecture** — carpetas + un slice vertical de ejemplo.
5. **06 · Theming / marca blanca** — pipeline SSR.
6. **07 · Módulo booking y disponibilidad** — algoritmo de slots + casos borde.
7. 08–11 según prioridad de negocio.

---

## 7. Métricas para decidir cuándo "graduar" del MVP

Activadores para abrir fases futuras (pagos, subdominios, notificaciones, IA):

- ≥ N barberías activas pagando intención de uso → **billing** (plan 09 + pasarela).
- Barberías pidiendo "su dominio" → **subdominios/dominios propios**.
- No-shows altos → **notificaciones** y luego **depósito de reserva**.
- Volumen de datos suficiente → **IA** (predicción/forecast).
