import { isWithinWorkingHours } from '../domain/working-hours'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface CreateManualAppointmentInput {
  organizationId:  string
  serviceId:       string
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
  const service = await repo.getBookableService(input.organizationId, input.serviceId)
  if (!service) return { ok: false, error: 'El servicio no está disponible.' }

  if (!(await repo.isActiveBarber(input.organizationId, input.barberId))) {
    return { ok: false, error: 'El barbero no está disponible.' }
  }

  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60_000)

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
    durationMin: service.durationMin,
    timezone,
    workingHours,
  })

  const customer = await repo.upsertCustomer(input.organizationId, input.customerName, input.customerPhone)

  const appointment = await repo.createAppointment({
    organizationId:  input.organizationId,
    serviceId:       input.serviceId,
    barberId:        input.barberId,
    customerId:      customer.id,
    customerName:    input.customerName,
    customerPhone:   input.customerPhone,
    startAt:         input.startAt,
    endAt,
    durationMin:     service.durationMin,
    priceCop:        service.priceCop,
    status:          'confirmed',
    source:          'manual',
    createdByUserId: input.createdByUserId,
    notes:           input.notes ?? null,
    isOffHours:      offHours,
  })

  return { ok: true, appointmentId: appointment.id, offHours }
}
