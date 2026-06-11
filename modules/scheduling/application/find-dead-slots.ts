import { addDays, format, getDay, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

/** Minutos libres mínimos para considerar que un barbero tiene "horas muertas". */
export const DEAD_SLOT_THRESHOLD_MIN = 90

export interface DeadSlotBarber {
  barberId:   string
  freeMin:    number  // minutos libres en la jornada
  workingMin: number  // duración total de la jornada
}

export interface DeadSlotDay {
  date:         string          // YYYY-MM-DD en TZ del tenant
  dateUtc:      Date
  barbers:      DeadSlotBarber[] // solo barberos con freeMin >= DEAD_SLOT_THRESHOLD_MIN
  totalFreeMin: number
}

/**
 * Use case: detecta los huecos de agenda de los próximos `daysAhead` días.
 *
 * Reutiliza los ports de SchedulingRepository (getBarberWorkingHours,
 * getBarberBusySlots, isDateBlocked) para calcular los minutos libres de
 * cada barbero sin añadir dependencias nuevas.
 *
 * `startFrom` es inyectable para facilitar los tests (default: ahora).
 */
export async function findDeadSlots(
  repo:           SchedulingRepository,
  organizationId: string,
  daysAhead = 3,
  startFrom?: Date,
): Promise<DeadSlotDay[]> {
  const [timezone, barberIds] = await Promise.all([
    repo.getOrgTimezone(organizationId),
    repo.listActiveBarberIds(organizationId),
  ])

  if (barberIds.length === 0) return []

  const base = startFrom ?? new Date()

  // Horarios laborales son datos semanales estáticos — se cargan una vez por barbero.
  const workingHoursMap = new Map(
    await Promise.all(
      barberIds.map(async (id) =>
        [id, await repo.getBarberWorkingHours(organizationId, id)] as const,
      ),
    ),
  )

  // Todos los días se procesan en paralelo.
  const settled = await Promise.all(
    Array.from({ length: daysAhead }, async (_, i) => {
      const dayUtc   = addDays(base, i + 1)
      const zonedDay = toZonedTime(dayUtc, timezone)
      const dateStr  = format(zonedDay, 'yyyy-MM-dd')
      const dow      = getDay(startOfDay(zonedDay)) // 0=dom…6=sáb

      const barberData = await Promise.all(
        barberIds.map(async (barberId) => {
          const [busySlots, isBlocked] = await Promise.all([
            repo.getBarberBusySlots(organizationId, barberId, dayUtc),
            repo.isDateBlocked(organizationId, barberId, dateStr),
          ])

          if (isBlocked) return null

          const workingHours = workingHoursMap.get(barberId) ?? []
          const wh = workingHours.find((w) => w.dayOfWeek === dow)
          if (!wh) return null

          const workingMin = wh.endMin - wh.startMin
          const busyMin    = busySlots.reduce(
            (sum, s) => sum + (s.endAt.getTime() - s.startAt.getTime()) / 60_000,
            0,
          )
          const freeMin = Math.max(0, workingMin - busyMin)
          return { barberId, freeMin, workingMin }
        }),
      )

      const barbers = barberData.filter(
        (d): d is DeadSlotBarber => d !== null && d.freeMin >= DEAD_SLOT_THRESHOLD_MIN,
      )

      if (barbers.length === 0) return null

      return {
        date:         dateStr,
        dateUtc:      dayUtc,
        barbers,
        totalFreeMin: barbers.reduce((s, b) => s + b.freeMin, 0),
      }
    }),
  )

  return settled.filter((d): d is DeadSlotDay => d !== null)
}
