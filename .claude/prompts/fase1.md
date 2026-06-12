# Citavek — Fase 1: Prompt de implementación completa

Este documento define todo el trabajo de Fase 1 para Citavek. Ejecutar en orden. No pasar al siguiente bloque sin terminar y validar el anterior.

Contexto del proyecto: SaaS multi-tenant de reservas para barberías (y próximamente otros negocios de belleza). Stack: Next.js 16 App Router, React 19, TypeScript, Prisma + PostgreSQL (Neon), Better Auth, Tailwind, shadcn/ui, Cloudinary, Sonner. Arquitectura hexagonal. Deploy en Vercel. Módulo de referencia: `modules/scheduling/`. Seguir todas las reglas de `CLAUDE.md` y los agentes en `.claude/agents/`.

---

## BLOQUE A — Landing page (citavek-app.vercel.app)

### Objetivo
La ruta `/` está vacía. Necesita una landing page pública de alto impacto que funcione como carta de presentación del producto para dueños de barberías potenciales.

### Requisitos de diseño
- Diseño oscuro, premium, moderno. Fondo negro/casi negro como base (coherente con lo que ya se ve en producción).
- Animaciones y transiciones profesionales con Framer Motion o CSS animations — scroll reveal, fade in, parallax sutil. Que se sienta de primer nivel.
- 100% responsive — móvil primero, ya que los dueños de barbería navegan desde el celular.
- PWA-ready: debe tener meta tags correctos para compartir por WhatsApp (OpenGraph: título, descripción, imagen de preview).

### Secciones requeridas (en orden)

**1. Hero**
- Headline potente. Ejemplo de dirección: "Tu barbería, siempre a tiempo." o "La agenda que tu barbería merece."
- Subtítulo que explique en una línea qué es Citavek.
- CTA principal: botón "Registra tu barbería" → link al flujo de registro con código de acceso.
- Animación de entrada — el texto aparece con transición suave, no brusca.

**2. Problema que resolvemos**
- 3 puntos de dolor reales del dueño de barbería: agenda en papel o WhatsApp, no-shows sin aviso, no saber cuánto produjo el día.
- Visual simple, íconos, sin mucho texto.

**3. Cómo funciona**
- 3 pasos simples: crea tu perfil → tus clientes reservan online → tú gestionas todo desde el panel.
- Animación tipo step-by-step al hacer scroll.

**4. Qué incluye**
- Features clave en cards: agenda digital, motor de reservas online, perfil público de la barbería, gestión de barberos y servicios, recordatorios por WhatsApp (manual por ahora), vista del cliente en móvil (PWA instalable).

**5. Diferenciadores — por qué Citavek y no los demás**
- Hecho para el mercado colombiano / latinoamericano.
- No pagas hasta que veas resultados (acceso por código por ahora).
- Tu barbería tiene su propia URL y página de reservas.
- Diseño premium que tus clientes van a querer usar.

**6. Social proof (placeholder por ahora)**
- Sección con espacio para 2-3 testimonios. Por ahora poner placeholders con nombres y texto genérico realista — se reemplazará con testimonios reales cuando lleguen.

**7. CTA final**
- Repetir el llamado a la acción: "¿Listo para modernizar tu barbería?"
- Botón de registro + nota: "Acceso por código durante el período de lanzamiento."
- Link de contacto por WhatsApp para solicitar código.

### Implementación técnica
- Crear `app/page.tsx` como Server Component.
- Extraer secciones en componentes en `app/_components/landing/`.
- Usar `next/image` con `priority` en el hero para LCP óptimo.
- Agregar meta tags OpenGraph completos en `app/layout.tsx` o en el metadata de `app/page.tsx`.
- No hay lógica de negocio aquí — es solo UI estática.

---

## BLOQUE B — Login de barbero

### Objetivo
Actualmente cualquier persona que entre al panel ve todas las citas de la organización. El barbero necesita su propio acceso y ver solo sus citas.

### Flujo completo a implementar

**B1. Generación de invitación (owner)**
- En el panel del owner, en la sección de gestión de equipo (`modules/staff`), agregar botón "Invitar barbero" junto a cada barbero que no tenga usuario vinculado (`barber.userId === null`).
- Al hacer click: generar un token único de invitación con expiración de 72 horas. Guardar en base de datos vinculado al `barberId` y `organizationId`.
- Mostrar al owner un link copiable: `citavek-app.vercel.app/invite/[token]`
- El owner lo envía por WhatsApp al barbero.

**B2. Registro del barbero (ruta pública)**
- Crear ruta pública `app/invite/[token]/page.tsx`.
- Al entrar: validar que el token existe, no está usado y no expiró. Si falla → mostrar pantalla de error con mensaje claro.
- Mostrar formulario: nombre (pre-llenado del perfil del barbero), email, contraseña.
- Al confirmar: crear `User` en Better Auth + `Member` con `role: 'barber'` para esa organización + actualizar `barber.userId = user.id` + marcar token como usado.
- Redirigir al panel del barbero.

**B3. Vista filtrada del barbero en el panel**
- En la agenda (`modules/scheduling`): si el usuario autenticado tiene `role: 'barber'`, filtrar `getAppointmentsForDate` por el `barberId` vinculado a ese usuario.
- El barbero solo ve sus citas — nunca las de sus compañeros.
- El owner con `role: 'owner'` sigue viendo todas las citas como hoy.

**B4. Métricas nuevas para el owner (obligatorio)**
- En el panel del owner, agregar sección de estadísticas de equipo:
  - Citas por barbero esta semana.
  - Barbero con más citas del mes.
  - Barberos activos vs sin cuenta vinculada.
- Estas métricas van en `modules/staff/queries.ts` usando `'use cache'` con tag `staff:${organizationId}`.

**B5. Telemetría para Super Admin (obligatorio)**
- En `modules/analytics`, agregar métricas de plataforma:
  - Ratio de barberos con login activo vs sin cuenta en toda la plataforma.
  - Tenants con equipo completo configurado vs tenants con barberos sin vincular.
- Estas métricas son señal de adopción del producto — un tenant con todos los barberos sin cuenta no está usando el sistema correctamente.

### Schema de Prisma necesario
```prisma
model BarberInvitation {
  id             String   @id @default(cuid())
  token          String   @unique
  barberId       String
  organizationId String
  used           Boolean  @default(false)
  expiresAt      DateTime
  createdAt      DateTime @default(now())

  barber         Barber       @relation(fields: [barberId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

### Módulo a crear/modificar
- Nuevo: `app/invite/[token]/` — ruta pública de registro.
- Modificar: `modules/staff` — agregar generación de invitación y métricas de equipo.
- Modificar: `modules/scheduling` — filtrado por barberId según rol.
- Modificar: `modules/analytics` — agregar métricas de adopción de login.

---

## BLOQUE C — Historial de cliente

### Objetivo
El owner necesita ver el historial completo de un cliente: cuántas veces ha venido, qué servicios pidió, con qué barbero, cuánto ha gastado.

### Implementación

**C1. Vista de clientes en el panel**
- En `modules/customers`, crear lista de clientes del tenant ordenada por "más reciente".
- Cada fila: nombre, teléfono, número de citas, última visita, total gastado.
- Click en un cliente → Sheet lateral con su historial completo de citas.

**C2. Detalle del cliente**
- Historial de citas: fecha, servicio, barbero, estado (completada / no-show / cancelada), precio.
- Estadísticas rápidas: total de visitas, promedio de días entre visitas, servicio favorito.

**C3. Métricas para el owner**
- En el dashboard del panel: card de "Clientes recurrentes este mes" (clientes con 2+ citas en 30 días).
- Card de "Clientes nuevos esta semana".

**C4. Telemetría para Super Admin**
- Promedio de clientes únicos por tenant por mes — métrica de salud del negocio.
- Tenants con 0 clientes nuevos en 30 días → señal de alerta de churn.

---

## BLOQUE D — Bloqueos de horario por barbero

### Objetivo
Hoy los bloqueos de calendario son a nivel de organización. Se necesita poder bloquear días u horas específicas por barbero (vacaciones, cita médica, turno libre).

### Implementación

**D1. UI en gestión de equipo**
- En el perfil de cada barbero dentro del panel, agregar sección "Días bloqueados".
- Usar `<DatePicker>` de `shared/ui/date-picker.tsx` para seleccionar fechas.
- Opción de bloqueo de día completo o rango de horas.

**D2. Motor de disponibilidad**
- En `modules/scheduling`, el slot calculator ya considera bloqueos de organización. Extender para considerar también bloqueos de barbero específico.
- Un slot donde el barbero solicitado tiene bloqueo no debe aparecer como disponible en el booking flow del cliente.

**D3. Schema**
```prisma
model BarberBlock {
  id             String    @id @default(cuid())
  barberId       String
  organizationId String
  date           DateTime
  startTime      String?   // null = día completo
  endTime        String?
  reason         String?
  createdAt      DateTime  @default(now())

  barber         Barber       @relation(fields: [barberId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])
}
```

---

## Orden de ejecución recomendado

1. **Bloque A** — Landing page. Es lo más visible, no tiene dependencias de otros bloques y da cara al producto inmediatamente.
2. **Bloque B** — Login de barbero. Es el más crítico operacionalmente y tiene el mayor impacto en cómo se usa el panel diariamente.
3. **Bloque C** — Historial de cliente. Depende de que ya haya citas en producción — se puede construir ahora y mejorará con el uso.
4. **Bloque D** — Bloqueos por barbero. Depende de que Bloque B esté listo (necesita barberos con cuenta vinculada).

---

## Reglas para todos los bloques

- Seguir arquitectura hexagonal: domain → application → infrastructure → ui.
- Referencia canónica de estructura: `modules/scheduling/`.
- Todo `organizationId` viene de `getTenantContext(slug)` — nunca del cliente.
- Guards fuera del try/catch en todos los Server Actions.
- Feedback al usuario siempre con `toast.success()` / `toast.error()` de sonner.
- Acciones destructivas con `<AlertDialog>` de confirmación.
- Cache con `cacheTag` y `updateTag` — no `revalidatePath`.
- Soft-delete en todas las entidades nuevas — no `prisma.delete`.
- Correr `npm run validate` antes de considerar cualquier bloque terminado.
- Al terminar cada bloque: ejecutar el pre-deploy audit de `.claude/prompts/pre-deploy.md`.