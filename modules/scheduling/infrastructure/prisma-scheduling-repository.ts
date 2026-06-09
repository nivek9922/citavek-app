import 'server-only'
import { db } from '@/server/db'
import type { Prisma } from '@/generated/prisma/client'
import { SlotConflictError, type AppointmentStatusValue } from '../domain/appointment'
import type { NewAppointment, SchedulingRepository } from '../domain/ports/scheduling-repository'

/**
 * Serializa las escrituras del mismo barbero tomando un advisory lock de
 * transacción (se libera al cerrar la tx). Cierra la ventana de carrera
 * "verificar-luego-insertar" sin requerir la exclusion constraint de Postgres
 * (que llegará por migración cuando el entorno corra en Node 20+).
 */
async function lockBarber(tx: Prisma.TransactionClient, organizationId: string, barberId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${barberId}))`
}

/** Re-verifica el solape DENTRO de la transacción (autoridad final). */
async function overlapsInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  barberId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const conflict = await tx.appointment.findFirst({
    where: {
      organizationId,
      barberId,
      status:  { in: ['pending', 'confirmed'] },
      startAt: { lt: endAt },
      endAt:   { gt: startAt },
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
    },
    select: { id: true },
  })
  return conflict !== null
}

// Adapter: implementación Prisma del Port SchedulingRepository.
export const prismaSchedulingRepository: SchedulingRepository = {
  async getBookableService(organizationId, serviceId) {
    return db.service.findFirst({
      where:  { id: serviceId, organizationId, active: true },
      select: { priceCop: true, durationMin: true },
    })
  },

  async isActiveBarber(organizationId, barberId) {
    const barber = await db.barber.findFirst({
      where:  { id: barberId, organizationId, active: true },
      select: { id: true },
    })
    return barber !== null
  },

  async hasConflict(organizationId, barberId, startAt, endAt, excludeAppointmentId?) {
    const conflict = await db.appointment.findFirst({
      where: {
        organizationId,
        barberId,
        status:  { in: ['pending', 'confirmed'] },
        startAt: { lt: endAt },
        endAt:   { gt: startAt },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
      select: { id: true },
    })
    return conflict !== null
  },

  async upsertCustomer(organizationId, name, phone) {
    return db.customer.upsert({
      where:  { organizationId_phone: { organizationId, phone } },
      update: { name },
      create: { organizationId, name, phone },
      select: { id: true },
    })
  },

  async createAppointment(data: NewAppointment) {
    // Lock + re-verificación + inserción en una sola transacción: dos reservas
    // concurrentes para el mismo barbero/horario no pueden insertar ambas.
    return db.$transaction(async (tx) => {
      await lockBarber(tx, data.organizationId, data.barberId)
      if (await overlapsInTx(tx, data.organizationId, data.barberId, data.startAt, data.endAt)) {
        throw new SlotConflictError()
      }
      return tx.appointment.create({
        data: {
          organizationId:  data.organizationId,
          serviceId:       data.serviceId,
          barberId:        data.barberId,
          customerId:      data.customerId,
          customerName:    data.customerName,
          customerPhone:   data.customerPhone,
          startAt:         data.startAt,
          endAt:           data.endAt,
          durationMin:     data.durationMin,
          priceCop:        data.priceCop,
          status:          data.status,
          source:          data.source,
          createdByUserId: data.createdByUserId ?? null,
          notes:           data.notes ?? null,
          isOffHours:      data.isOffHours ?? false,
        },
        select: { id: true },
      })
    })
  },

  async getAppointmentForStatusChange(organizationId, appointmentId) {
    const apt = await db.appointment.findFirst({
      where:  { id: appointmentId, organizationId },
      select: { status: true, startAt: true },
    })
    if (!apt) return null
    return { status: apt.status as AppointmentStatusValue, startAt: apt.startAt }
  },

  async updateAppointmentStatus(organizationId, appointmentId, status, cancelledAt) {
    await db.appointment.updateMany({
      where: { id: appointmentId, organizationId },
      data:  { status, cancelledAt: cancelledAt ?? undefined },
    })
  },

  async getOrgTimezone(organizationId) {
    const org = await db.organization.findUnique({
      where:  { id: organizationId },
      select: { timezone: true },
    })
    return org?.timezone ?? 'America/Bogota'
  },

  async getBarberWorkingHours(organizationId, barberId) {
    return db.workingHour.findMany({
      where:  { barberId, barber: { organizationId } },
      select: { dayOfWeek: true, startMin: true, endMin: true },
    })
  },

  async getAppointmentForReschedule(organizationId, appointmentId) {
    const apt = await db.appointment.findFirst({
      where:  { id: appointmentId, organizationId },
      select: { status: true, serviceId: true, barberId: true },
    })
    if (!apt) return null
    return {
      status:    apt.status as import('../domain/appointment').AppointmentStatusValue,
      serviceId: apt.serviceId,
      barberId:  apt.barberId,
    }
  },

  async updateAppointmentTime(organizationId, appointmentId, newStartAt, newEndAt) {
    // Mismo blindaje que createAppointment para la reprogramación.
    await db.$transaction(async (tx) => {
      const apt = await tx.appointment.findFirst({
        where:  { id: appointmentId, organizationId },
        select: { barberId: true },
      })
      if (!apt) return
      await lockBarber(tx, organizationId, apt.barberId)
      if (await overlapsInTx(tx, organizationId, apt.barberId, newStartAt, newEndAt, appointmentId)) {
        throw new SlotConflictError()
      }
      await tx.appointment.updateMany({
        where: { id: appointmentId, organizationId },
        data:  { startAt: newStartAt, endAt: newEndAt },
      })
    })
  },

  async getBarberBusySlots(organizationId, barberId, forDate) {
    // Ventana UTC ±24 h alrededor del día solicitado; computeAvailableSlots
    // filtra por TZ del tenant, así que ser sobre-inclusivo es correcto.
    const dayStart = new Date(forDate)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 48 * 60 * 60_000)

    return db.appointment.findMany({
      where: {
        organizationId,
        barberId,
        status:  { in: ['pending', 'confirmed'] },
        startAt: { lt: dayEnd },
        endAt:   { gt: dayStart },
      },
      select: { startAt: true, endAt: true },
    })
  },

  async getAppointmentForCustomer(appointmentId, customerPhone) {
    const apt = await db.appointment.findFirst({
      where:  { id: appointmentId, customerPhone },
      select: {
        id:             true,
        organizationId: true,
        status:         true,
        startAt:        true,
        endAt:          true,
        customerName:   true,
        notes:          true,
        service:  { select: { name: true, durationMin: true, priceCop: true } },
        barber:   { select: { displayName: true, nickname: true } },
        organization: {
          select: { name: true, slug: true, timezone: true, phone: true },
        },
      },
    })
    if (!apt) return null
    return {
      id:             apt.id,
      organizationId: apt.organizationId,
      status:         apt.status as import('../domain/appointment').AppointmentStatusValue,
      startAt:        apt.startAt,
      endAt:          apt.endAt,
      customerName:   apt.customerName,
      notes:          apt.notes ?? null,
      service:        apt.service,
      barber:         apt.barber,
      organization:   { ...apt.organization, phone: apt.organization.phone ?? null },
    }
  },

  async isDateBlocked(organizationId, barberId, dateStr) {
    const exception = await db.scheduleException.findFirst({
      where: {
        organizationId,
        date: dateStr,
        OR: [{ barberId }, { barberId: null }],
      },
      select: { id: true },
    })
    return exception !== null
  },

  async blockDate(organizationId, barberId, dateStr, reason) {
    // barberId null = bloqueo de toda la org. Postgres trata NULL como distinto en
    // índices únicos, así que un upsert por la clave compuesta con null no encuentra
    // la fila existente (y permitiría duplicados). Se busca explícitamente.
    const existing = await db.scheduleException.findFirst({
      where:  { organizationId, barberId: barberId ?? null, date: dateStr },
      select: { id: true },
    })
    if (existing) {
      await db.scheduleException.update({
        where: { id: existing.id },
        data:  { reason: reason ?? null },
      })
    } else {
      await db.scheduleException.create({
        data: { organizationId, barberId, date: dateStr, reason: reason ?? null },
      })
    }
  },

  async unblockDate(organizationId, barberId, dateStr) {
    await db.scheduleException.deleteMany({
      where: { organizationId, barberId: barberId ?? null, date: dateStr },
    })
  },
}
