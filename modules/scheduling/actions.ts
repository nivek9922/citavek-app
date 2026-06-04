'use server'
import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { db } from '@/server/db'
import { getAvailableSlots } from './queries'

// ── Obtener slots disponibles (lectura pública) ─────────────────────────────

const getSlotsSchema = z.object({
  barberId:    z.string().min(1),
  dateISO:     z.string().datetime(),
  durationMin: z.number().int().min(5).max(480),
})

export async function getAvailableSlotsAction(
  slug: string,
  input: z.infer<typeof getSlotsSchema>,
): Promise<{ slots: string[] }> {
  const ctx    = await getTenantContext(slug)
  const parsed = getSlotsSchema.parse(input)

  const slots = await getAvailableSlots({
    organizationId: ctx.id,
    barberId:       parsed.barberId,
    date:           new Date(parsed.dateISO),
    timezone:       ctx.timezone,
    durationMin:    parsed.durationMin,
  })

  return { slots: slots.map((d) => d.toISOString()) }
}

// ── Crear cita (reserva pública) ────────────────────────────────────────────
// IMPORTANTE: precio y duración se derivan del SERVIDOR, nunca del cliente.
// serviceId y barberId se validan contra el tenant activo.

const bookSchema = z.object({
  serviceId:     z.string().min(1),
  barberId:      z.string().min(1),
  startAtISO:    z.string().datetime(),
  customerName:  z.string().trim().min(2).max(80),
  customerPhone: z.string().regex(/^\+57\d{10}$/, 'Número de WhatsApp inválido'),
})

export type BookInput = z.infer<typeof bookSchema>

export async function bookAppointmentAction(
  slug: string,
  input: BookInput,
): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  try {
    const ctx    = await getTenantContext(slug)
    const parsed = bookSchema.parse(input)

    // 1. Validar que el servicio pertenece al tenant y está activo.
    //    El precio y la duración salen de aquí, NO del cliente.
    const service = await db.service.findFirst({
      where:  { id: parsed.serviceId, organizationId: ctx.id, active: true },
      select: { priceCop: true, durationMin: true },
    })
    if (!service) return { ok: false, error: 'El servicio seleccionado no está disponible.' }

    // 2. Validar que el barbero pertenece al tenant y está activo.
    const barber = await db.barber.findFirst({
      where:  { id: parsed.barberId, organizationId: ctx.id, active: true },
      select: { id: true },
    })
    if (!barber) return { ok: false, error: 'El barbero seleccionado no está disponible.' }

    // 3. La cita no puede ser en el pasado (margen de 5 min).
    const startAt = new Date(parsed.startAtISO)
    if (startAt.getTime() < Date.now() - 5 * 60_000) {
      return { ok: false, error: 'El horario seleccionado ya pasó.' }
    }
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000)

    // 4. Re-verificar que el slot sigue libre (protección anti-doble-reserva).
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId: ctx.id,
        barberId:       parsed.barberId,
        status:         { in: ['pending', 'confirmed'] },
        startAt:        { lt: endAt },
        endAt:          { gt: startAt },
      },
      select: { id: true },
    })
    if (conflict) return { ok: false, error: 'Este horario ya no está disponible.' }

    // 5. Upsert del cliente por teléfono dentro de la barbería.
    const customer = await db.customer.upsert({
      where:  { organizationId_phone: { organizationId: ctx.id, phone: parsed.customerPhone } },
      update: { name: parsed.customerName },
      create: { organizationId: ctx.id, name: parsed.customerName, phone: parsed.customerPhone },
    })

    // 6. Crear la cita con datos del servidor.
    const appointment = await db.appointment.create({
      data: {
        organizationId: ctx.id,
        serviceId:      parsed.serviceId,
        barberId:       parsed.barberId,
        customerId:     customer.id,
        customerName:   parsed.customerName,
        customerPhone:  parsed.customerPhone,
        startAt,
        endAt,
        durationMin:    service.durationMin, // del servidor
        priceCop:       service.priceCop,    // del servidor
        status:         'confirmed',
        source:         'online',
      },
      select: { id: true },
    })

    revalidatePath(`/${slug}`)
    return { ok: true, appointmentId: appointment.id }
  } catch (err) {
    // No exponer detalles internos al cliente.
    console.error('[bookAppointmentAction]', err)
    return { ok: false, error: 'No se pudo crear la cita. Intenta de nuevo.' }
  }
}

// ── Alta manual de cita (panel admin) ───────────────────────────────────────

const manualSchema = z.object({
  serviceId:     z.string().min(1),
  barberId:      z.string().min(1),
  dateStr:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStr:       z.string().regex(/^\d{2}:\d{2}$/),
  customerName:  z.string().trim().min(2).max(80),
  customerPhone: z.string().regex(/^\+57\d{10}$/, 'Teléfono inválido'),
  notes:         z.string().trim().max(300).optional(),
})

export type ManualAppointmentInput = z.infer<typeof manualSchema>

export async function createManualAppointmentAction(
  slug: string,
  input: ManualAppointmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getTenantContext(slug)
    const { session } = await requirePermission(ctx.id, 'appointment:create')
    const parsed = manualSchema.parse(input)

    const service = await db.service.findFirst({
      where:  { id: parsed.serviceId, organizationId: ctx.id, active: true },
      select: { priceCop: true, durationMin: true },
    })
    if (!service) return { ok: false, error: 'El servicio no está disponible.' }

    const barber = await db.barber.findFirst({
      where:  { id: parsed.barberId, organizationId: ctx.id, active: true },
      select: { id: true },
    })
    if (!barber) return { ok: false, error: 'El barbero no está disponible.' }

    // Combinar fecha + hora local del tenant → instante UTC.
    const startAt = fromZonedTime(`${parsed.dateStr}T${parsed.timeStr}:00`, ctx.timezone)
    const endAt   = new Date(startAt.getTime() + service.durationMin * 60_000)

    const conflict = await db.appointment.findFirst({
      where: {
        organizationId: ctx.id,
        barberId:       parsed.barberId,
        status:         { in: ['pending', 'confirmed'] },
        startAt:        { lt: endAt },
        endAt:          { gt: startAt },
      },
      select: { id: true },
    })
    if (conflict) return { ok: false, error: 'Ese barbero ya tiene una cita en ese horario.' }

    const customer = await db.customer.upsert({
      where:  { organizationId_phone: { organizationId: ctx.id, phone: parsed.customerPhone } },
      update: { name: parsed.customerName },
      create: { organizationId: ctx.id, name: parsed.customerName, phone: parsed.customerPhone },
    })

    await db.appointment.create({
      data: {
        organizationId:  ctx.id,
        serviceId:       parsed.serviceId,
        barberId:        parsed.barberId,
        customerId:      customer.id,
        customerName:    parsed.customerName,
        customerPhone:   parsed.customerPhone,
        startAt,
        endAt,
        durationMin:     service.durationMin,
        priceCop:        service.priceCop,
        status:          'confirmed',
        source:          'manual',
        createdByUserId: session.user.id,
        notes:           parsed.notes ?? null,
      },
    })

    revalidatePath(`/${slug}/panel`)
    return { ok: true }
  } catch (err) {
    console.error('[createManualAppointmentAction]', err)
    return { ok: false, error: 'No se pudo crear la cita.' }
  }
}

// ── Actualizar estado de cita (panel admin) ─────────────────────────────────

const STATUS = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])

const VALID_TRANSITIONS: Record<string, z.infer<typeof STATUS>[]> = {
  confirmed: ['completed', 'cancelled', 'no_show'],
  pending:   ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show:   [],
}

export async function updateAppointmentStatusAction(
  slug: string,
  appointmentId: string,
  newStatus: string,
) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')

  const status = STATUS.parse(newStatus)

  const apt = await db.appointment.findFirst({
    where:  { id: appointmentId, organizationId: ctx.id },
    select: { status: true },
  })
  if (!apt) throw new Error('Cita no encontrada')

  const allowed = VALID_TRANSITIONS[apt.status] ?? []
  if (!allowed.includes(status)) {
    throw new Error(`Transición inválida: ${apt.status} → ${status}`)
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status,
      cancelledAt: status === 'cancelled' ? new Date() : undefined,
    },
  })

  revalidatePath(`/${slug}/panel`)
}
