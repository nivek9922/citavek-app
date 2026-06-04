import 'server-only'
import { format, addDays, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { db } from '@/server/db'

// ── Helpers de zona horaria ─────────────────────────────────────────────────

/** Fecha calendario "hoy" (YYYY-MM-DD) en la zona horaria del tenant. */
export function tenantToday(timezone: string): string {
  return format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd')
}

/** Rango UTC [start, end) del día calendario local del tenant.
 *  Cada medianoche se calcula en la TZ → correcto incluso con DST. */
function localDayBoundsUTC(dateStr: string, timezone: string) {
  const nextStr = format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd')
  return {
    start: fromZonedTime(`${dateStr}T00:00:00`, timezone),
    end:   fromZonedTime(`${nextStr}T00:00:00`, timezone),
  }
}

// ── KPIs del dashboard (siempre "hoy" + "esta semana") ──────────────────────

export async function getDashboardKPIs(organizationId: string, timezone: string) {
  const today = tenantToday(timezone)
  const { start: todayStart, end: todayEnd } = localDayBoundsUTC(today, timezone)

  const localNow      = toZonedTime(new Date(), timezone)
  const weekStartStr  = format(startOfWeek(localNow, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEndStr    = format(endOfWeek(localNow,   { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekStart     = localDayBoundsUTC(weekStartStr, timezone).start
  const weekEnd       = localDayBoundsUTC(weekEndStr,   timezone).end

  const [todayApts, weekApts, barbers] = await Promise.all([
    db.appointment.findMany({
      where: { organizationId, startAt: { gte: todayStart, lt: todayEnd }, status: { not: 'cancelled' } },
      select: { status: true, priceCop: true, barberId: true },
    }),
    db.appointment.findMany({
      where: { organizationId, startAt: { gte: weekStart, lt: weekEnd }, status: 'completed' },
      select: { priceCop: true },
    }),
    db.barber.findMany({
      where: { organizationId, active: true },
      select: { id: true, displayName: true, nickname: true },
    }),
  ])

  const earningsToday = todayApts.filter((a) => a.status === 'completed').reduce((s, a) => s + a.priceCop, 0)
  const pendingToday  = todayApts.filter((a) => a.status === 'confirmed').length
  const cutsToday     = todayApts.filter((a) => a.status === 'completed').length
  const earningsWeek  = weekApts.reduce((s, a) => s + a.priceCop, 0)

  const countByBarber: Record<string, number> = {}
  for (const a of todayApts) countByBarber[a.barberId] = (countByBarber[a.barberId] ?? 0) + 1
  const topBarberId = Object.entries(countByBarber).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topBarber   = barbers.find((b) => b.id === topBarberId) ?? null

  return { earningsToday, pendingToday, cutsToday, earningsWeek, topBarber }
}

// ── Citas de un día calendario específico (agenda navegable) ────────────────

export async function getAppointmentsForDate(
  organizationId: string,
  timezone: string,
  dateStr: string,
) {
  const { start, end } = localDayBoundsUTC(dateStr, timezone)

  return db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: start, lt: end },
      status:  { not: 'cancelled' },
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true, startAt: true, endAt: true, status: true,
      customerName: true, customerPhone: true, priceCop: true, notes: true,
      service: { select: { name: true, durationMin: true } },
      barber:  { select: { id: true, displayName: true, nickname: true } },
    },
  })
}

export type AppointmentRow = Awaited<ReturnType<typeof getAppointmentsForDate>>[number]
