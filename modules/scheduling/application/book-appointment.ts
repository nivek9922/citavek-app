import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface BookAppointmentInput {
  organizationId: string
  serviceId:      string
  barberId:       string
  startAt:        Date
  customerName:   string
  customerPhone:  string
}

export type BookAppointmentResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string }

/** Use case: reservar una cita desde la página pública. */
export async function bookAppointment(
  repo: SchedulingRepository,
  input: BookAppointmentInput,
): Promise<BookAppointmentResult> {
  const service = await repo.getBookableService(input.organizationId, input.serviceId)
  if (!service) return { ok: false, error: 'El servicio seleccionado no está disponible.' }

  if (!(await repo.isActiveBarber(input.organizationId, input.barberId))) {
    return { ok: false, error: 'El barbero seleccionado no está disponible.' }
  }

  if (input.startAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false, error: 'El horario seleccionado ya pasó.' }
  }

  const endAt = new Date(input.startAt.getTime() + service.durationMin * 60_000)

  if (await repo.hasConflict(input.organizationId, input.barberId, input.startAt, endAt)) {
    return { ok: false, error: 'Este horario ya no está disponible.' }
  }

  const customer = await repo.upsertCustomer(input.organizationId, input.customerName, input.customerPhone)

  const appointment = await repo.createAppointment({
    organizationId: input.organizationId,
    serviceId:      input.serviceId,
    barberId:       input.barberId,
    customerId:     customer.id,
    customerName:   input.customerName,
    customerPhone:  input.customerPhone,
    startAt:        input.startAt,
    endAt,
    durationMin:    service.durationMin,
    priceCop:       service.priceCop,
    status:         'confirmed',
    source:         'online',
  })

  return { ok: true, appointmentId: appointment.id }
}
