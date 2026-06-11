'use server'
import { revalidatePath } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { headers } from 'next/headers'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import log from '@/server/logger'
import { SlotConflictError, FutureCompletionError } from './domain/appointment'
import { isAnyBarber } from './domain/any-barber'
import { prismaSchedulingRepository as repo } from './infrastructure/prisma-scheduling-repository'
import { bookAppointment }          from './application/book-appointment'
import { createManualAppointment }  from './application/create-manual-appointment'
import { changeAppointmentStatus }  from './application/change-appointment-status'
import { rescheduleAppointment }    from './application/reschedule-appointment'
import { getAvailableSlots }         from './application/get-available-slots'
import { getAnyBarberSlots, pickBarberForSlot } from './application/get-any-barber-slots'
import { blockBarberDate }           from './application/block-barber-date'
import { unblockBarberDate }         from './application/unblock-barber-date'

// ── Slots disponibles (lectura pública / read side) ─────────────────────────
// serviceId viene del cliente (el usuario eligió el servicio), pero la duración
// la deriva el servidor desde la DB — el cliente nunca puede manipularla.

const getSlotsSchema = z.object({
  barberId:  z.string().min(1),
  serviceId: z.string().min(1),
  dateISO:   z.string().datetime(),
})

export async function getAvailableSlotsAction(
  slug: string,
  input: z.infer<typeof getSlotsSchema>,
): Promise<{ slots: string[]; busyCount: number }> {
  const ctx    = await getTenantContext(slug)
  const parsed = getSlotsSchema.parse(input)
  const date   = new Date(parsed.dateISO)

  if (isAnyBarber(parsed.barberId)) {
    const result = await getAnyBarberSlots(repo, {
      organizationId: ctx.id,
      serviceId:      parsed.serviceId,
      date,
    })
    if (!result.ok) return { slots: [], busyCount: 0 }
    // Para "cualquier barbero" no hay una métrica de demanda por barbero único; se asume disponibilidad alta.
    return { slots: result.slots.map((d) => d.toISOString()), busyCount: 0 }
  }

  const result = await getAvailableSlots(repo, {
    organizationId: ctx.id,
    barberId:       parsed.barberId,
    serviceId:      parsed.serviceId,
    date,
  })

  if (!result.ok) return { slots: [], busyCount: 0 }
  return { slots: result.slots.map((d) => d.toISOString()), busyCount: result.busyCount }
}

// ── Reservar cita (pública) ─────────────────────────────────────────────────

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
    // Endpoint público: límite por IP para frenar spam de reservas.
    const ip = clientIpFrom(await headers())
    if (!await rateLimit(`book:${ip}`, 8, 60_000)) {
      return { ok: false, error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' }
    }

    const ctx    = await getTenantContext(slug)
    const parsed = bookSchema.parse(input)

    let barberId = parsed.barberId
    if (isAnyBarber(barberId)) {
      const assigned = await pickBarberForSlot(repo, {
        organizationId: ctx.id,
        serviceId:      parsed.serviceId,
        startAt:        new Date(parsed.startAtISO),
      })
      if (!assigned) return { ok: false, error: 'No hay barberos disponibles en ese horario.' }
      barberId = assigned
    }

    const result = await bookAppointment(repo, {
      organizationId: ctx.id,
      serviceId:      parsed.serviceId,
      barberId,
      startAt:        new Date(parsed.startAtISO),
      customerName:   parsed.customerName,
      customerPhone:  parsed.customerPhone,
    })

    if (result.ok) revalidatePath(`/${slug}`)
    return result
  } catch (err) {
    if (err instanceof SlotConflictError) {
      return { ok: false, error: 'Este horario ya no está disponible.' }
    }
    log.error('bookAppointmentAction', { err: String(err) })
    return { ok: false, error: 'No se pudo crear la cita. Intenta de nuevo.' }
  }
}

// ── Alta manual de cita (panel) ─────────────────────────────────────────────

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
): Promise<{ ok: true; offHours: boolean } | { ok: false; error: string }> {
  // Guards fuera del try: notFound()/redirect() lanzan errores de control de flujo
  // de Next.js que un catch silenciaría (sesión expirada → "No se pudo crear" en
  // vez de ir a login).
  const ctx = await getTenantContext(slug)
  const { session } = await requirePermission(ctx.id, 'appointment:create')
  try {
    const parsed = manualSchema.parse(input)

    // Combinar fecha + hora local del tenant → instante UTC (en el borde).
    const startAt = fromZonedTime(`${parsed.dateStr}T${parsed.timeStr}:00`, ctx.timezone)

    const result = await createManualAppointment(repo, {
      organizationId:  ctx.id,
      serviceId:       parsed.serviceId,
      barberId:        parsed.barberId,
      startAt,
      customerName:    parsed.customerName,
      customerPhone:   parsed.customerPhone,
      createdByUserId: session.user.id,
      notes:           parsed.notes ?? null,
    })

    if (result.ok) revalidatePath(`/${slug}/panel`)
    return result.ok ? { ok: true, offHours: result.offHours } : result
  } catch (err) {
    if (err instanceof SlotConflictError) {
      return { ok: false, error: 'Ese barbero ya tiene una cita en ese horario.' }
    }
    log.error('createManualAppointmentAction', { err: String(err) })
    return { ok: false, error: 'No se pudo crear la cita.' }
  }
}

// ── Reprogramar cita (panel / cliente) ─────────────────────────────────────

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  dateStr:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStr:       z.string().regex(/^\d{2}:\d{2}$/),
})

export type RescheduleInput = z.infer<typeof rescheduleSchema>

export async function rescheduleAppointmentAction(
  slug: string,
  input: RescheduleInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')
  try {
    const parsed = rescheduleSchema.parse(input)

    const newStartAt = fromZonedTime(`${parsed.dateStr}T${parsed.timeStr}:00`, ctx.timezone)

    const result = await rescheduleAppointment(repo, {
      organizationId: ctx.id,
      appointmentId:  parsed.appointmentId,
      newStartAt,
    })

    if (result.ok) revalidatePath(`/${slug}/panel`)
    return result.ok ? { ok: true } : result
  } catch (err) {
    if (err instanceof SlotConflictError) {
      return { ok: false, error: 'Ese barbero ya tiene una cita en el nuevo horario.' }
    }
    log.error('rescheduleAppointmentAction', { err: String(err) })
    return { ok: false, error: 'No se pudo reprogramar la cita.' }
  }
}

// ── Bloquear / desbloquear día en la agenda (panel) ────────────────────────

const blockDateSchema = z.object({
  barberId: z.string().min(1).nullable(),
  dateStr:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  reason:   z.string().trim().max(120).optional(),
})

export async function blockBarberDateAction(
  slug: string,
  input: z.infer<typeof blockDateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')
  try {
    const parsed = blockDateSchema.parse(input)

    const result = await blockBarberDate(repo, {
      organizationId: ctx.id,
      barberId:       parsed.barberId,
      dateStr:        parsed.dateStr,
      reason:         parsed.reason ?? null,
    })

    if (result.ok) revalidatePath(`/${slug}/panel`)
    return result
  } catch (err) {
    log.error('blockBarberDateAction', { err: String(err) })
    return { ok: false, error: 'No se pudo bloquear el día.' }
  }
}

export async function unblockBarberDateAction(
  slug: string,
  input: { barberId: string | null; dateStr: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')
  try {
    const result = await unblockBarberDate(repo, {
      organizationId: ctx.id,
      barberId:       input.barberId,
      dateStr:        input.dateStr,
    })

    if (result.ok) revalidatePath(`/${slug}/panel`)
    return result
  } catch (err) {
    log.error('unblockBarberDateAction', { err: String(err) })
    return { ok: false, error: 'No se pudo desbloquear el día.' }
  }
}

// ── Cambiar estado de cita (panel) ──────────────────────────────────────────

const statusSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])

export async function updateAppointmentStatusAction(
  slug: string,
  appointmentId: string,
  newStatus: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')
  try {
    await changeAppointmentStatus(repo, {
      organizationId: ctx.id,
      appointmentId,
      newStatus: statusSchema.parse(newStatus),
    })

    revalidatePath(`/${slug}/panel`)
    return { ok: true }
  } catch (err) {
    if (err instanceof FutureCompletionError) {
      return { ok: false, error: 'No puedes completar una cita futura.' }
    }
    log.error('updateAppointmentStatusAction', { err: String(err) })
    return { ok: false, error: 'No se pudo actualizar la cita.' }
  }
}
