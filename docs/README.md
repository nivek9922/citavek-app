# BookingFlow — Documentación de arquitectura y planes

SaaS multi-tenant para barberías (Colombia, COP), construido sobre **Next.js 16**,
React 19, TypeScript estricto, PostgreSQL + Prisma, Tailwind 4 + shadcn/ui.

Referencia de producto/diseño: el prototipo Lovable `barrio-glow-up` (**BarberOS**),
un SPA con el flujo de reserva, panel admin y marca blanca ya validados a nivel UX.

## Decisiones fundacionales (congeladas)

| Tema | Decisión | Estado |
|------|----------|--------|
| URLs multi-tenant | Path-based `/[tenant]`, resolver swappeable | ✅ MVP |
| Autenticación | `better-auth` self-hosted (organizations + RBAC) | ✅ MVP |
| Pagos / billing | **Sin pasarela en MVP.** Modelo `Plan`/entitlements ligero; pagos online y depósito de reserva como fase futura | ⏸️ Diferido |
| Hosting / DB | Vercel + Postgres gestionado (Neon o Supabase) | ✅ MVP |
| Aislamiento de datos | DB compartida, esquema compartido con columna `organizationId` + scoping en repositorios | ✅ MVP |

## Cómo leer estos planes

Los documentos van de lo general a lo específico. Cada plan posterior **profundiza
uno o varios capítulos** del plan fundacional. No se escribe código de aplicación
hasta cerrar los planes `00`–`05`.

| # | Documento | Estado | Contenido |
|---|-----------|--------|-----------|
| 00 | [Arquitectura y visión](./00-arquitectura-y-vision.md) | ✅ Escrito | Bounded contexts, Clean Architecture, multi-tenant, theming, entitlements, IA-ready |
| 01 | [Roadmap del MVP](./01-mvp-roadmap.md) | ✅ Escrito | Alcance in/out, fases de entrega, criterios de éxito |
| 02 | [Modelo de datos y Prisma](./02-modelo-de-datos-y-prisma.md) | ✅ Escrito | Schema completo, enums, índices, dinero/tiempo, migraciones, seed |
| 03 | [Multi-tenancy y TenantContext](./03-multitenancy-y-tenant-context.md) | ✅ Escrito | Resolver, `proxy.ts`, scoping de repositorios, hoja de ruta RLS |
| 04 | [Auth y RBAC](./04-auth-y-rbac.md) | ✅ Escrito | `better-auth`, organizations, roles/permisos, protección de rutas y actions |
| 05 | [Estructura y Clean Architecture](./05-estructura-y-clean-architecture.md) | ✅ Escrito | Esqueleto de carpetas, regla de dependencias, slice vertical de ejemplo |
| 06 | Theming / marca blanca | ⏳ Pendiente | Pipeline de theming SSR, tokens, branding por tenant |
| 07 | Módulo booking y disponibilidad | ⏳ Pendiente | Algoritmo de slots, flujo de reserva, casos borde (TZ, doble reserva) |
| 08 | Panel admin y analítica | ⏳ Pendiente | Agenda, KPIs, read-models |
| 09 | Suscripciones y entitlements | ⏳ Pendiente | Planes, feature gating (billing diferido) |
| 10 | Observabilidad, testing, CI/CD | ⏳ Pendiente | Pirámide de tests, pooling de DB, deploy Vercel |
| 11 | Roadmap de IA | ⏳ Pendiente | Ganchos para features de IA sobre la capa de aplicación |

> El orden de escritura sugerido es 00 → 01 → 02 → 03 → 04 → 05, y a partir de ahí
> por módulo (06–11) según las prioridades del negocio.
