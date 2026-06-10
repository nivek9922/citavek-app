import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
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
  | { ok: true;  slots: Date[]; busyCount: number }
  | { ok: false; error: string }

/**
 * Use case: obtener los slots libres de un barbero para un servicio y día dados.
 *
 * Round 1 (paralelo): valida servicio + barbero + obtiene timezone.
 *   → permite hacer early-return antes de ir a la DB por más datos.
 * Round 2 (paralelo): horarios, citas ocupadas y check de día bloqueado.
 *   → si el día está bloqueado, devuelve [] sin calcular nada más.
 */
export async function getAvailableSlots(
  repo: SchedulingRepository,
  input: GetAvailableSlotsInput,
): Promise<GetAvailableSlotsResult> {
  const [service, isBarberActive, timezone] = await Promise.all([
    repo.getBookableService(input.organizationId, input.serviceId),
    repo.isActiveBarber(input.organizationId, input.barberId),
    repo.getOrgTimezone(input.organizationId),
  ])

  if (!service)        return { ok: false, error: 'El servicio no está disponible.' }
  if (!isBarberActive) return { ok: false, error: 'El barbero no está disponible.' }

  const dateStr = format(toZonedTime(input.date, timezone), 'yyyy-MM-dd')

  const [workingHours, busySlots, isBlocked] = await Promise.all([
    repo.getBarberWorkingHours(input.organizationId, input.barberId),
    repo.getBarberBusySlots(input.organizationId, input.barberId, input.date),
    repo.isDateBlocked(input.organizationId, input.barberId, dateStr),
  ])

  if (isBlocked) return { ok: true, slots: [], busyCount: 0 }

  const { slots, busyCount } = computeAvailableSlots({
    date:          input.date,
    timezone,
    workingHours,
    existingSlots: busySlots,
    durationMin:   service.durationMin,
  })

  return { ok: true, slots, busyCount }
}
