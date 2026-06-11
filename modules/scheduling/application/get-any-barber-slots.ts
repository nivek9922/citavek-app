import { computeSlotsForBarber } from './get-available-slots'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface AnyBarberInput {
  organizationId: string
  serviceId:      string
  /** Cualquier Date que represente el día deseado (año/mes/día en la TZ del tenant). */
  date:           Date
}

type PerBarberSlots = { barberId: string; slots: Date[] }

/**
 * Resuelve servicio, timezone y barberos activos UNA sola vez y computa los
 * slots de cada barbero en paralelo. Sustituye al patrón N+1 que invocaba
 * getAvailableSlots por barbero (re-consultando servicio/timezone N veces).
 */
async function getSlotsPerActiveBarber(
  repo: SchedulingRepository,
  input: AnyBarberInput,
): Promise<{ ok: true; perBarber: PerBarberSlots[] } | { ok: false; error: string }> {
  const [service, timezone, barberIds] = await Promise.all([
    repo.getBookableService(input.organizationId, input.serviceId),
    repo.getOrgTimezone(input.organizationId),
    repo.listActiveBarberIds(input.organizationId),
  ])

  if (!service) return { ok: false, error: 'El servicio no está disponible.' }

  const perBarber = await Promise.all(
    barberIds.map(async (barberId) => {
      const { slots } = await computeSlotsForBarber(repo, {
        organizationId: input.organizationId,
        barberId,
        date:           input.date,
        timezone,
        durationMin:    service.durationMin,
      })
      return { barberId, slots }
    }),
  )

  return { ok: true, perBarber }
}

/** Use case: unión de slots libres de todos los barberos activos (orden cronológico, sin duplicados). */
export async function getAnyBarberSlots(
  repo: SchedulingRepository,
  input: AnyBarberInput,
): Promise<{ ok: true; slots: Date[] } | { ok: false; error: string }> {
  const result = await getSlotsPerActiveBarber(repo, input)
  if (!result.ok) return result

  const seen  = new Set<number>()
  const slots: Date[] = []
  for (const { slots: barberSlots } of result.perBarber) {
    for (const slot of barberSlots) {
      const t = slot.getTime()
      if (!seen.has(t)) { seen.add(t); slots.push(slot) }
    }
  }
  slots.sort((a, b) => a.getTime() - b.getTime())
  return { ok: true, slots }
}

/**
 * Use case: asignar barbero para un slot concreto en una reserva "cualquier
 * barbero". Devuelve el primer barbero activo (por sortOrder) con el slot
 * libre, o null si ninguno está disponible.
 */
export async function pickBarberForSlot(
  repo: SchedulingRepository,
  input: { organizationId: string; serviceId: string; startAt: Date },
): Promise<string | null> {
  const result = await getSlotsPerActiveBarber(repo, {
    organizationId: input.organizationId,
    serviceId:      input.serviceId,
    date:           input.startAt,
  })
  if (!result.ok) return null

  const target = input.startAt.getTime()
  // perBarber conserva el orden de listActiveBarberIds (sortOrder asc).
  const match = result.perBarber.find(({ slots }) => slots.some((s) => s.getTime() === target))
  return match?.barberId ?? null
}
