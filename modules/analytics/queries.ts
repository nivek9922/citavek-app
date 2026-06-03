import 'server-only'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { db } from '@/server/db'

export async function getDashboardKPIs(organizationId: string, timezone: string) {
  const nowUTC   = new Date()
  const nowLocal = toZonedTime(nowUTC, timezone)

  const todayStart = startOfDay(nowLocal)
  const todayEnd   = endOfDay(nowLocal)
  const weekStart  = startOfWeek(nowLocal, { weekStartsOn: 1 })
  const weekEnd    = endOfWeek(nowLocal,   { weekStartsOn: 1 })

  const [todayApts, weekApts, barbers] = await Promise.all([
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: todayStart, lte: todayEnd },
        status:  { not: 'cancelled' },
      },
      select: { status: true, priceCop: true, barberId: true },
    }),
    db.appointment.findMany({
      where: {
        organizationId,
        startAt: { gte: weekStart, lte: weekEnd },
        status:  'completed',
      },
      select: { priceCop: true },
    }),
    db.barber.findMany({
      where: { organizationId, active: true },
      select: { id: true, displayName: true, nickname: true },
    }),
  ])

  const earningsToday = todayApts
    .filter((a) => a.status === 'completed')
    .reduce((s, a) => s + a.priceCop, 0)

  const pendingToday  = todayApts.filter((a) => a.status === 'confirmed').length
  const cutsToday     = todayApts.filter((a) => a.status === 'completed').length
  const earningsWeek  = weekApts.reduce((s, a) => s + a.priceCop, 0)

  // Top barbero por citas hoy
  const countByBarber: Record<string, number> = {}
  for (const a of todayApts) countByBarber[a.barberId] = (countByBarber[a.barberId] ?? 0) + 1
  const topBarberId = Object.entries(countByBarber).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topBarber   = barbers.find((b) => b.id === topBarberId) ?? null

  return { earningsToday, pendingToday, cutsToday, earningsWeek, topBarber }
}

export async function getTodayAppointments(organizationId: string, timezone: string) {
  const nowLocal   = toZonedTime(new Date(), timezone)
  const todayStart = startOfDay(nowLocal)
  const todayEnd   = endOfDay(nowLocal)

  return db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: todayStart, lte: todayEnd },
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

export type AppointmentRow = Awaited<ReturnType<typeof getTodayAppointments>>[number]
