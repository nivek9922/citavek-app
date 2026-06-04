import 'server-only'
import { db } from '@/server/db'
import type { AppointmentStatusValue } from '../domain/appointment'
import type { NewAppointment, SchedulingRepository } from '../domain/ports/scheduling-repository'

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
    return db.appointment.create({
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
      },
      select: { id: true },
    })
  },

  async getAppointmentStatus(organizationId, appointmentId) {
    const apt = await db.appointment.findFirst({
      where:  { id: appointmentId, organizationId },
      select: { status: true },
    })
    return (apt?.status as AppointmentStatusValue | undefined) ?? null
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
    await db.appointment.updateMany({
      where: { id: appointmentId, organizationId },
      data:  { startAt: newStartAt, endAt: newEndAt },
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
}
