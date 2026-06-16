import { isWithinWorkingHours } from '../domain/working-hours'
import { resolveSelectedServices } from '../domain/service-selection'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface CreateManualAppointmentInput {
  organizationId:  string
  serviceIds:      string[]
  barberId:        string
  startAt:         Date
  customerName:    string
  customerPhone:   string
  createdByUserId: string
  notes?:          string | null
}

export type CreateManualAppointmentResult =
  | { ok: true; appointmentId: string; offHours: boolean }
  | { ok: false; error: string }

/** Use case: alta manual de cita desde el panel (staff). */
export async function createManualAppointment(
  repo: SchedulingRepository,
  input: CreateManualAppointmentInput,
): Promise<CreateManualAppointmentResult> {
  if (input.startAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false, error: 'No se pueden crear citas en el pasado.' }
  }

  const services = await repo.getBookableServices(input.organizationId, input.serviceIds)
  const resolved = resolveSelectedServices(input.serviceIds, services)
  if (!resolved) return { ok: false, error: 'Alguno de los servicios no está disponible.' }

  if (!(await repo.isActiveBarber(input.organizationId, input.barberId))) {
    return { ok: false, error: 'El barbero no está disponible.' }
  }

  const endAt = new Date(input.startAt.getTime() + resolved.totalDurationMin * 60_000)

  if (await repo.hasConflict(input.organizationId, input.barberId, input.startAt, endAt)) {
    return { ok: false, error: 'Ese barbero ya tiene una cita en ese horario.' }
  }

  // Fuera de horario no bloquea: se registra el flag y la UI lo informa.
  const [timezone, workingHours] = await Promise.all([
    repo.getOrgTimezone(input.organizationId),
    repo.getBarberWorkingHours(input.organizationId, input.barberId),
  ])
  const offHours = !isWithinWorkingHours({
    startAt:     input.startAt,
    durationMin: resolved.totalDurationMin,
    timezone,
    workingHours,
  })

  const customer = await repo.upsertCustomer(input.organizationId, input.customerName, input.customerPhone)

  const appointment = await repo.createAppointment({
    organizationId:  input.organizationId,
    services:        resolved.lines,
    barberId:        input.barberId,
    customerId:      customer.id,
    customerName:    input.customerName,
    customerPhone:   input.customerPhone,
    startAt:         input.startAt,
    endAt,
    durationMin:     resolved.totalDurationMin,
    priceCop:        resolved.totalPriceCop,
    status:          'confirmed',
    source:          'manual',
    createdByUserId: input.createdByUserId,
    notes:           input.notes ?? null,
    isOffHours:      offHours,
  })

  return { ok: true, appointmentId: appointment.id, offHours }
}
