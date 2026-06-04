import 'server-only'
import { db } from '@/server/db'
import { tenantToday, localDayBoundsUTC, currentWeekBoundsUTC } from './domain/date-utils'
import { computeKPIs } from './domain/kpi-calculator'

export { tenantToday } from './domain/date-utils'

// ── KPIs del dashboard (siempre "hoy" + "esta semana") ──────────────────────

export async function getDashboardKPIs(organizationId: string, timezone: string) {
  const today                    = tenantToday(timezone)
  const { start: todayStart, end: todayEnd } = localDayBoundsUTC(today, timezone)
  const { weekStart, weekEnd }   = currentWeekBoundsUTC(timezone)

  const [todayApts, weekApts, barbers] = await Promise.all([
    db.appointment.findMany({
      where:  { organizationId, startAt: { gte: todayStart, lt: todayEnd }, status: { not: 'cancelled' } },
      select: { status: true, priceCop: true, barberId: true },
    }),
    db.appointment.findMany({
      where:  { organizationId, startAt: { gte: weekStart, lt: weekEnd }, status: 'completed' },
      select: { priceCop: true },
    }),
    db.barber.findMany({
      where:  { organizationId, active: true },
      select: { id: true, displayName: true, nickname: true },
    }),
  ])

  return computeKPIs(todayApts, weekApts, barbers)
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
