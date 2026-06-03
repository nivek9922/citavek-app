// Función pura — sin deps de framework ni DB. Testeable de forma aislada.
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { startOfDay, addMinutes, getDay } from 'date-fns'

export interface WorkingHourInput {
  dayOfWeek: number // 0=dom…6=sáb
  startMin:  number // minutos desde medianoche (hora local del tenant)
  endMin:    number
}

export interface BusySlot {
  startAt: Date // UTC
  endAt:   Date // UTC
}

export interface ComputeSlotsParams {
  date:          Date   // cualquier Date; se usa solo año/mes/día en la TZ del tenant
  timezone:      string // IANA, e.g. "America/Bogota"
  workingHours:  WorkingHourInput[]
  existingSlots: BusySlot[]
  durationMin:   number
  stepMin?:      number // paso entre slots, default 30
}

/** Retorna array de fechas UTC (inicio de cada slot libre). */
export function computeAvailableSlots({
  date,
  timezone,
  workingHours,
  existingSlots,
  durationMin,
  stepMin = 30,
}: ComputeSlotsParams): Date[] {
  // Medianoche del día seleccionado en la TZ del tenant
  const localMidnight = startOfDay(toZonedTime(date, timezone))
  const dow = getDay(localMidnight) // 0=dom…6=sáb

  const wh = workingHours.find((w) => w.dayOfWeek === dow)
  if (!wh) return []

  // Convertir horario local → UTC
  const dayStartUTC = fromZonedTime(addMinutes(localMidnight, wh.startMin), timezone)
  const dayEndUTC   = fromZonedTime(addMinutes(localMidnight, wh.endMin),   timezone)

  const nowPlusBuffer = Date.now() + 15 * 60_000
  const stepMs  = stepMin    * 60_000
  const durMs   = durationMin * 60_000

  const slots: Date[] = []
  let cursor = dayStartUTC.getTime()

  while (cursor + durMs <= dayEndUTC.getTime()) {
    const slotEnd = cursor + durMs
    const inPast  = cursor < nowPlusBuffer
    const overlaps = existingSlots.some(
      (b) => cursor < b.endAt.getTime() && slotEnd > b.startAt.getTime(),
    )
    if (!inPast && !overlaps) slots.push(new Date(cursor))
    cursor += stepMs
  }

  return slots
}
