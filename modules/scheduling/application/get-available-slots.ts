import { computeAvailableSlots } from '../domain/slot-calculator'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface GetAvailableSlotsInput {
  organizationId: string
  barberId:       string
  serviceId:      string
  /** Cualquier Date que represente el día deseado (año/mes/día en la TZ del tenant). */
  date:           Date
}

export type GetAvailableSlotsResult =
  | { ok: true;  slots: Date[] }
  | { ok: false; error: string }

/**
 * Use case: obtener los slots libres de un barbero para un servicio y día dados.
 *
 * Todas las consultas al repo se lanzan en paralelo; computeAvailableSlots es
 * una función pura del dominio que no toca infraestructura.
 */
export async function getAvailableSlots(
  repo: SchedulingRepository,
  input: GetAvailableSlotsInput,
): Promise<GetAvailableSlotsResult> {
  const [service, isBarberActive, timezone, workingHours, busySlots] = await Promise.all([
    repo.getBookableService(input.organizationId, input.serviceId),
    repo.isActiveBarber(input.organizationId, input.barberId),
    repo.getOrgTimezone(input.organizationId),
    repo.getBarberWorkingHours(input.organizationId, input.barberId),
    repo.getBarberBusySlots(input.organizationId, input.barberId, input.date),
  ])

  if (!service)         return { ok: false, error: 'El servicio no está disponible.' }
  if (!isBarberActive)  return { ok: false, error: 'El barbero no está disponible.' }

  const slots = computeAvailableSlots({
    date:          input.date,
    timezone,
    workingHours,
    existingSlots: busySlots,
    durationMin:   service.durationMin,
  })

  return { ok: true, slots }
}
