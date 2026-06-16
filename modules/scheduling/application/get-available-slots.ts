import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { computeAvailableSlots } from '../domain/slot-calculator'
import { resolveSelectedServices } from '../domain/service-selection'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface GetAvailableSlotsInput {
  organizationId: string
  barberId:       string
  serviceIds:     string[]
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
  const [services, isBarberActive, timezone] = await Promise.all([
    repo.getBookableServices(input.organizationId, input.serviceIds),
    repo.isActiveBarber(input.organizationId, input.barberId),
    repo.getOrgTimezone(input.organizationId),
  ])

  const resolved = resolveSelectedServices(input.serviceIds, services)
  if (!resolved)       return { ok: false, error: 'Alguno de los servicios no está disponible.' }
  if (!isBarberActive) return { ok: false, error: 'El barbero no está disponible.' }

  const { slots, busyCount } = await computeSlotsForBarber(repo, {
    organizationId: input.organizationId,
    barberId:       input.barberId,
    date:           input.date,
    timezone,
    durationMin:    resolved.totalDurationMin,
  })

  return { ok: true, slots, busyCount }
}

/**
 * Round 2 reutilizable: dado servicio y timezone ya resueltos, computa los
 * slots de UN barbero. Lo comparte el flujo "cualquier barbero" para no
 * re-consultar servicio/timezone por cada barbero (evita N+1).
 */
export async function computeSlotsForBarber(
  repo: SchedulingRepository,
  ctx: {
    organizationId: string
    barberId:       string
    date:           Date
    timezone:       string
    durationMin:    number
  },
): Promise<{ slots: Date[]; busyCount: number }> {
  const dateStr = format(toZonedTime(ctx.date, ctx.timezone), 'yyyy-MM-dd')

  const [workingHours, busySlots, isBlocked] = await Promise.all([
    repo.getBarberWorkingHours(ctx.organizationId, ctx.barberId),
    repo.getBarberBusySlots(ctx.organizationId, ctx.barberId, ctx.date),
    repo.isDateBlocked(ctx.organizationId, ctx.barberId, dateStr),
  ])

  if (isBlocked) return { slots: [], busyCount: 0 }

  return computeAvailableSlots({
    date:          ctx.date,
    timezone:      ctx.timezone,
    workingHours,
    existingSlots: busySlots,
    durationMin:   ctx.durationMin,
  })
}
