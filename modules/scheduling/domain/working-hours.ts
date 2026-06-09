// Función pura — sin deps de framework ni DB. Testeable de forma aislada.
import { toZonedTime } from 'date-fns-tz'
import { getDay, getHours, getMinutes } from 'date-fns'
import type { WorkingHourInput } from './slot-calculator'

export interface WithinWorkingHoursParams {
  startAt:      Date   // UTC
  durationMin:  number
  timezone:     string // IANA, e.g. "America/Bogota"
  workingHours: WorkingHourInput[]
}

/**
 * ¿La cita [startAt, startAt + durationMin] cae dentro del horario laboral
 * del barbero? Sin WorkingHour para ese día de la semana → false (off-hours).
 *
 * El día de semana y los minutos se evalúan en la TZ del tenant, no en UTC.
 * Una cita que cruza medianoche local (endMin local > 1440) nunca cabe en un
 * horario válido, así que queda off-hours automáticamente.
 */
export function isWithinWorkingHours({
  startAt,
  durationMin,
  timezone,
  workingHours,
}: WithinWorkingHoursParams): boolean {
  const local = toZonedTime(startAt, timezone)
  const dow   = getDay(local) // 0=dom…6=sáb

  const wh = workingHours.find((w) => w.dayOfWeek === dow)
  if (!wh) return false

  const startMinLocal = getHours(local) * 60 + getMinutes(local)
  const endMinLocal   = startMinLocal + durationMin

  return startMinLocal >= wh.startMin && endMinLocal <= wh.endMin
}
