import { resolveSelectedServices } from '../domain/service-selection'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface BookAppointmentInput {
  organizationId: string
  serviceIds:     string[]
  barberId:       string
  startAt:        Date
  customerName:   string
  customerPhone:  string
  // Hook de lealtad inyectado por el delivery layer: dado el desglose de líneas
  // devuelve el descuento en COP. Mantiene scheduling desacoplado de loyalty.
  computeRewardDiscount?: (lines: { serviceId: string; priceCop: number }[]) => number
}

export type BookAppointmentResult =
  | { ok: true; appointmentId: string; priceCop: number; discountCop: number; rewardApplied: boolean }
  | { ok: false; error: string }

/** Use case: reservar una cita desde la página pública. */
export async function bookAppointment(
  repo: SchedulingRepository,
  input: BookAppointmentInput,
): Promise<BookAppointmentResult> {
  const services = await repo.getBookableServices(input.organizationId, input.serviceIds)
  const resolved = resolveSelectedServices(input.serviceIds, services)
  if (!resolved) return { ok: false, error: 'Alguno de los servicios seleccionados no está disponible.' }

  if (!(await repo.isActiveBarber(input.organizationId, input.barberId))) {
    return { ok: false, error: 'El barbero seleccionado no está disponible.' }
  }

  if (input.startAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false, error: 'El horario seleccionado ya pasó.' }
  }

  const endAt = new Date(input.startAt.getTime() + resolved.totalDurationMin * 60_000)

  if (await repo.hasConflict(input.organizationId, input.barberId, input.startAt, endAt)) {
    return { ok: false, error: 'Este horario ya no está disponible.' }
  }

  // Recompensa de lealtad (server-side): el descuento se deriva del desglose real,
  // nunca de lo que diga el cliente.
  const discountCop   = input.computeRewardDiscount ? input.computeRewardDiscount(resolved.lines) : 0
  const priceCop      = Math.max(0, resolved.totalPriceCop - discountCop)
  const rewardApplied = discountCop > 0

  const customer = await repo.upsertCustomer(input.organizationId, input.customerName, input.customerPhone)

  const appointment = await repo.createAppointment({
    organizationId: input.organizationId,
    services:       resolved.lines,
    barberId:       input.barberId,
    customerId:     customer.id,
    customerName:   input.customerName,
    customerPhone:  input.customerPhone,
    startAt:        input.startAt,
    endAt,
    durationMin:    resolved.totalDurationMin,
    priceCop,
    status:         'confirmed',
    source:         'online',
  })

  return { ok: true, appointmentId: appointment.id, priceCop, discountCop, rewardApplied }
}
