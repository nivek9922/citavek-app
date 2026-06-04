import { format, addDays, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/** Fecha calendario "hoy" (YYYY-MM-DD) en la zona horaria del tenant. */
export function tenantToday(timezone: string): string {
  return format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd')
}

/** Rango UTC [start, end) del día calendario indicado en la TZ del tenant.
 *  Cada medianoche se calcula en la TZ → correcto incluso con DST. */
export function localDayBoundsUTC(
  dateStr: string,
  timezone: string,
): { start: Date; end: Date } {
  const nextStr = format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd')
  return {
    start: fromZonedTime(`${dateStr}T00:00:00`, timezone),
    end:   fromZonedTime(`${nextStr}T00:00:00`, timezone),
  }
}

export interface WeekBoundsUTC {
  weekStart: Date
  weekEnd:   Date
}

/** Rango UTC [weekStart, weekEnd) de la semana actual (lun–dom) en la TZ del tenant. */
export function currentWeekBoundsUTC(timezone: string): WeekBoundsUTC {
  const localNow     = toZonedTime(new Date(), timezone)
  const weekStartStr = format(startOfWeek(localNow, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEndStr   = format(endOfWeek(localNow,   { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return {
    weekStart: localDayBoundsUTC(weekStartStr, timezone).start,
    weekEnd:   localDayBoundsUTC(weekEndStr,   timezone).end,
  }
}
