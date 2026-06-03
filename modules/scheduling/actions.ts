'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { db } from '@/server/db'

// ── Actualizar estado de cita (panel admin) ────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  confirmed:  ['completed', 'cancelled', 'no_show'],
  pending:    ['confirmed', 'cancelled'],
  completed:  [],
  cancelled:  [],
  no_show:    [],
}

export async function updateAppointmentStatusAction(
  slug: string,
  appointmentId: string,
  newStatus: string,
) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')

  const apt = await db.appointment.findFirst({
    where: { id: appointmentId, organizationId: ctx.id },
    select: { status: true },
  })
  if (!apt) throw new Error('Cita no encontrada')

  const allowed = VALID_TRANSITIONS[apt.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(`No se puede cambiar de ${apt.status} a ${newStatus}`)
  }

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      status:      newStatus as any,
      cancelledAt: newStatus === 'cancelled' ? new Date() : undefined,
    },
  })

  revalidatePath(`/${slug}/panel`)
}
import { getAvailableSlots } from './queries'

// ── Obtener slots disponibles (acción de lectura) ──────────────────────────

const getSlotsSchema = z.object({
  barberId:    z.string().cuid(),
  dateISO:     z.string(), // ISO 8601
  durationMin: z.number().int().min(5),
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

// ── Crear cita ─────────────────────────────────────────────────────────────

const bookSchema = z.object({
  serviceId:     z.string().cuid(),
  barberId:      z.string().cuid(),
  startAtISO:    z.string(),
  durationMin:   z.number().int().min(5),
  priceCop:      z.number().int().min(0),
  customerName:  z.string().min(2).max(80),
  customerPhone: z.string().regex(/^\+57\d{10}$/, 'Número inválido'),
})

export type BookInput = z.infer<typeof bookSchema>

export async function bookAppointmentAction(
  slug: string,
  input: BookInput,
): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  try {
    const ctx    = await getTenantContext(slug)
    const parsed = bookSchema.parse(input)

    const startAt = new Date(parsed.startAtISO)
    const endAt   = new Date(startAt.getTime() + parsed.durationMin * 60_000)

    // Verificar que el slot sigue libre (protección contra doble reserva)
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId: ctx.id,
        barberId:       parsed.barberId,
        status:         { in: ['pending', 'confirmed'] },
        startAt:        { lt: endAt },
        endAt:          { gt: startAt },
      },
    })
    if (conflict) return { ok: false, error: 'Este horario ya no está disponible.' }

    // Upsert customer por teléfono dentro de la barbería
    const customer = await db.customer.upsert({
      where: {
        organizationId_phone: { organizationId: ctx.id, phone: parsed.customerPhone },
      },
      update: { name: parsed.customerName },
      create: {
        organizationId: ctx.id,
        name:  parsed.customerName,
        phone: parsed.customerPhone,
      },
    })

    const appointment = await db.appointment.create({
      data: {
        organizationId:  ctx.id,
        serviceId:       parsed.serviceId,
        barberId:        parsed.barberId,
        customerId:      customer.id,
        customerName:    parsed.customerName,
        customerPhone:   parsed.customerPhone,
        startAt,
        endAt,
        durationMin:     parsed.durationMin,
        priceCop:        parsed.priceCop,
        status:          'confirmed',
        source:          'online',
      },
    })

    revalidatePath(`/${slug}`)

    return { ok: true, appointmentId: appointment.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return { ok: false, error: msg }
  }
}
