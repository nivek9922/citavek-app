'use server'
import { revalidatePath, updateTag } from 'next/cache'
import { fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission, requireActiveSubscription } from '@/server/auth-guards'
import { SubscriptionInactiveError } from '@/modules/subscriptions/domain/subscription'
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
// Orquestación de lealtad (delivery layer): sumar visita al completar y canjear
// recompensa al reservar. computeRewardDiscount es dominio puro inyectado al use case.
import { prismaLoyaltyRepository as loyaltyRepo } from '@/modules/loyalty/infrastructure/prisma-loyalty-repository'
import { getLoyaltyProgram }     from '@/modules/loyalty/queries'
import { recordCompletedVisit }  from '@/modules/loyalty/application/record-completed-visit'
import { getRedeemableReward, redeemReward } from '@/modules/loyalty/application/redeem-reward'
import { computeRewardDiscount } from '@/modules/loyalty/domain/loyalty'

// ── Slots disponibles (lectura pública / read side) ─────────────────────────
// serviceIds vienen del cliente (el usuario eligió los servicios), pero la
// duración TOTAL la deriva el servidor desde la DB — el cliente nunca puede
// manipularla.

const getSlotsSchema = z.object({
  barberId:   z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  dateISO:    z.string().datetime(),
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
      serviceIds:     parsed.serviceIds,
      date,
    })
    if (!result.ok) return { slots: [], busyCount: 0 }
    // Para "cualquier barbero" no hay una métrica de demanda por barbero único; se asume disponibilidad alta.
    return { slots: result.slots.map((d) => d.toISOString()), busyCount: 0 }
  }

  const result = await getAvailableSlots(repo, {
    organizationId: ctx.id,
    barberId:       parsed.barberId,
    serviceIds:     parsed.serviceIds,
    date,
  })

  if (!result.ok) return { slots: [], busyCount: 0 }
  return { slots: result.slots.map((d) => d.toISOString()), busyCount: result.busyCount }
}

// ── Reservar cita (pública) ─────────────────────────────────────────────────

const bookSchema = z.object({
  serviceIds:    z.array(z.string().min(1)).min(1),
  barberId:      z.string().min(1),
  startAtISO:    z.string().datetime(),
  customerName:  z.string().trim().min(2).max(80),
  customerPhone: z.string().regex(/^\+\d{7,15}$/, 'Número de WhatsApp inválido'),
})

export type BookInput = z.infer<typeof bookSchema>

export async function bookAppointmentAction(
  slug: string,
  input: BookInput,
): Promise<{ ok: true; appointmentId: string; priceCop: number; rewardApplied: boolean } | { ok: false; error: string }> {
  // Endpoint público: límite por IP para frenar spam de reservas.
  const ip = clientIpFrom(await headers())
  if (!await rateLimit(`book:${ip}`, 8, 60_000)) {
    return { ok: false, error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' }
  }

  // Guards fuera del try: notFound() lanza un error de control de flujo de Next.js
  // que un catch silenciaría (tenant inexistente → "No se pudo crear" en vez de 404).
  const ctx = await getTenantContext(slug)

  try {
    await requireActiveSubscription(ctx.id)
    const parsed = bookSchema.parse(input)

    let barberId = parsed.barberId
    if (isAnyBarber(barberId)) {
      const assigned = await pickBarberForSlot(repo, {
        organizationId: ctx.id,
        serviceIds:     parsed.serviceIds,
        startAt:        new Date(parsed.startAtISO),
      })
      if (!assigned) return { ok: false, error: 'No hay barberos disponibles en ese horario.' }
      barberId = assigned
    }

    // Recompensa pendiente (server-side): el descuento se deriva del desglose real.
    const redeemable = await getRedeemableReward(loyaltyRepo, {
      organizationId: ctx.id,
      customerPhone:  parsed.customerPhone,
    })

    const result = await bookAppointment(repo, {
      organizationId: ctx.id,
      serviceIds:     parsed.serviceIds,
      barberId,
      startAt:        new Date(parsed.startAtISO),
      customerName:   parsed.customerName,
      customerPhone:  parsed.customerPhone,
      computeRewardDiscount: redeemable
        ? (lines) => computeRewardDiscount(redeemable.program, lines)
        : undefined,
    })

    if (result.ok && result.rewardApplied && redeemable) {
      try {
        await redeemReward(loyaltyRepo, {
          organizationId: ctx.id,
          customerPhone:  parsed.customerPhone,
          rewardType:     redeemable.program.rewardType,
          discountCop:    result.discountCop,
          appointmentId:  result.appointmentId,
        })
        updateTag(`loyalty-stats:${ctx.id}`)
        updateTag(`org-stats:${ctx.id}`)
      } catch (e) {
        log.error('loyalty.redeem.book', {
          err:            String(e),
          organizationId: ctx.id,
          appointmentId:  result.appointmentId,
          customerPhone:  parsed.customerPhone,
        })
        try { await repo.markRedemptionFailed(ctx.id, result.appointmentId) }
        catch (e2) { log.error('loyalty.markFailed.book', { err: String(e2), appointmentId: result.appointmentId }) }
      }
    }

    return result.ok
      ? { ok: true, appointmentId: result.appointmentId, priceCop: result.priceCop, rewardApplied: result.rewardApplied }
      : result
  } catch (err) {
    if (err instanceof SubscriptionInactiveError) {
      return { ok: false, error: err.message }
    }
    if (err instanceof SlotConflictError) {
      return { ok: false, error: 'Este horario ya no está disponible.' }
    }
    log.error('bookAppointmentAction', { err: String(err) })
    return { ok: false, error: 'No se pudo crear la cita. Intenta de nuevo.' }
  }
}

// ── Alta manual de cita (panel) ─────────────────────────────────────────────

// El horario llega como ISO (el slot exacto que devolvió el motor), igual que la
// reserva pública. Nada de hora libre: solo slots reales calculados por scheduling.
const manualSchema = z.object({
  serviceIds:    z.array(z.string().min(1)).min(1),
  barberId:      z.string().min(1),
  startAtISO:    z.string().datetime(),
  customerName:  z.string().trim().min(2).max(80),
  customerPhone: z.string().regex(/^\+\d{7,15}$/, 'Teléfono inválido'),
  notes:         z.string().trim().max(300).optional(),
})

export type ManualAppointmentInput = z.infer<typeof manualSchema>

export async function createManualAppointmentAction(
  slug: string,
  input: ManualAppointmentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Guards fuera del try: notFound()/redirect() lanzan errores de control de flujo
  // de Next.js que un catch silenciaría (sesión expirada → "No se pudo crear" en
  // vez de ir a login).
  const ctx = await getTenantContext(slug)
  const { session, member } = await requirePermission(ctx.id, 'appointment:create')
  try {
    await requireActiveSubscription(ctx.id)
    const parsed  = manualSchema.parse(input)
    const startAt = new Date(parsed.startAtISO)

    // Un barbero solo puede agendar en SU propia agenda: ignoramos el barberId
    // del cliente y lo forzamos al barbero vinculado a su usuario. El owner sí
    // puede elegir cualquier barbero (validado como activo por el use case).
    let barberId = parsed.barberId
    if (member.role === 'barber') {
      const ownBarberId = await repo.findActiveBarberIdByUserId(ctx.id, session.user.id)
      if (!ownBarberId) return { ok: false, error: 'Tu usuario no está vinculado a un barbero activo.' }
      barberId = ownBarberId
    }

    // El horario debe ser un slot REAL que el motor considere disponible (respeta
    // turno, días bloqueados y citas existentes). Cierra el hueco de enviar una
    // hora arbitraria desde el cliente: la disponibilidad es la misma que ve el
    // booking público.
    const availability = await getAvailableSlots(repo, {
      organizationId: ctx.id,
      barberId,
      serviceIds:     parsed.serviceIds,
      date:           startAt,
    })
    const isRealSlot = availability.ok && availability.slots.some((s) => s.getTime() === startAt.getTime())
    if (!isRealSlot) {
      return { ok: false, error: 'Ese horario ya no está disponible.' }
    }

    // Recompensa pendiente (server-side): el owner/barbero también puede canjearla
    // al agendar manualmente.
    const redeemable = await getRedeemableReward(loyaltyRepo, {
      organizationId: ctx.id,
      customerPhone:  parsed.customerPhone,
    })

    const result = await createManualAppointment(repo, {
      organizationId:  ctx.id,
      serviceIds:      parsed.serviceIds,
      barberId,
      startAt,
      customerName:    parsed.customerName,
      customerPhone:   parsed.customerPhone,
      createdByUserId: session.user.id,
      notes:           parsed.notes ?? null,
      computeRewardDiscount: redeemable
        ? (lines) => computeRewardDiscount(redeemable.program, lines)
        : undefined,
    })

    if (result.ok) {
      revalidatePath(`/${slug}/panel`)
      if (result.rewardApplied && redeemable) {
        try {
          await redeemReward(loyaltyRepo, {
            organizationId: ctx.id,
            customerPhone:  parsed.customerPhone,
            rewardType:     redeemable.program.rewardType,
            discountCop:    result.discountCop,
            appointmentId:  result.appointmentId,
          })
          updateTag(`loyalty-stats:${ctx.id}`)
          updateTag(`org-stats:${ctx.id}`)
        } catch (e) {
          log.error('loyalty.redeem.manual', {
            err:            String(e),
            organizationId: ctx.id,
            appointmentId:  result.appointmentId,
            customerPhone:  parsed.customerPhone,
          })
          try { await repo.markRedemptionFailed(ctx.id, result.appointmentId) }
          catch (e2) { log.error('loyalty.markFailed.manual', { err: String(e2), appointmentId: result.appointmentId }) }
        }
      }
    }
    return result.ok ? { ok: true } : result
  } catch (err) {
    if (err instanceof SubscriptionInactiveError) {
      return { ok: false, error: err.message }
    }
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

    if (result.ok) updateTag(`schedule:${ctx.id}`)
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

    if (result.ok) updateTag(`schedule:${ctx.id}`)
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
    const parsedStatus = statusSchema.parse(newStatus)
    const { customerPhone, customerName } = await changeAppointmentStatus(repo, {
      organizationId: ctx.id,
      appointmentId,
      newStatus: parsedStatus,
    })

    // Lealtad: cada cita completada suma una visita. Aislado en su propio try para
    // que un fallo del programa nunca tumbe el cambio de estado (la cita ya se completó).
    if (parsedStatus === 'completed') {
      try {
        const program = await getLoyaltyProgram(ctx.id)
        if (program?.isActive) {
          await recordCompletedVisit(loyaltyRepo, {
            organizationId: ctx.id,
            customerPhone,
            customerName,
            program,
          })
          updateTag(`loyalty-stats:${ctx.id}`)
          updateTag(`org-stats:${ctx.id}`)
        }
      } catch (e) {
        log.error('loyalty.recordVisit', { err: String(e) })
      }
    }

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
