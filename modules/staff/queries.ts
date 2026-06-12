import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { db } from '@/server/db'

/** Barberos activos (página pública). Cacheado hasta que `barbers:${orgId}` se invalide. */
export async function listActiveBarbers(organizationId: string) {
  'use cache'
  cacheTag(`barbers:${organizationId}`)
  cacheLife('max')
  return db.barber.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    select: {
      id: true, displayName: true, nickname: true,
      avatarUrl: true, specialties: true, rating: true, reviewsCount: true,
    },
  })
}

/** Todos los barberos con horarios (panel). Incluye userId para detectar cuenta vinculada. */
export async function listAllBarbersWithHours(organizationId: string) {
  'use cache'
  cacheTag(`barbers:${organizationId}`)
  cacheLife('max')
  return db.barber.findMany({
    where:   { organizationId },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { displayName: 'asc' }],
    select: {
      id: true, displayName: true, nickname: true, avatarUrl: true,
      specialties: true, rating: true, reviewsCount: true, active: true, sortOrder: true,
      userId: true,
      workingHours: { select: { dayOfWeek: true, startMin: true, endMin: true } },
    },
  })
}

/** Barbero vinculado a un userId en una org (para el filtro de agenda del panel). */
export async function getBarberByUserId(organizationId: string, userId: string) {
  return db.barber.findFirst({
    where:  { organizationId, userId, active: true },
    select: { id: true, displayName: true },
  })
}

/** Estadísticas de equipo para el owner (B4). Tag staff:${orgId}. */
export async function getTeamStats(organizationId: string) {
  'use cache'
  cacheTag(`staff:${organizationId}`)
  cacheLife('days')

  const weekStart = new Date()
  weekStart.setUTCHours(0, 0, 0, 0)
  // Retroceder al lunes de esta semana (ISO)
  const day = weekStart.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  weekStart.setUTCDate(weekStart.getUTCDate() + diffToMonday)

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [weekByBarber, monthByBarber, barbers] = await Promise.all([
    db.appointment.groupBy({
      by:     ['barberId'],
      where:  { organizationId, startAt: { gte: weekStart }, status: { not: 'cancelled' } },
      _count: { _all: true },
      orderBy: { _count: { barberId: 'desc' } },
    }),
    db.appointment.groupBy({
      by:     ['barberId'],
      where:  { organizationId, startAt: { gte: monthStart }, status: { not: 'cancelled' } },
      _count: { _all: true },
      orderBy: { _count: { barberId: 'desc' } },
    }),
    db.barber.findMany({
      where:   { organizationId, active: true },
      select:  { id: true, displayName: true, nickname: true, userId: true },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    }),
  ])

  const barberMap = new Map(barbers.map((b) => [b.id, b]))

  const weekStats = weekByBarber.map((r) => ({
    barber: barberMap.get(r.barberId),
    count:  r._count._all,
  })).filter((r) => r.barber != null)

  const topThisMonth = monthByBarber[0]
    ? { barber: barberMap.get(monthByBarber[0].barberId), count: monthByBarber[0]._count._all }
    : null

  const withAccount    = barbers.filter((b) => b.userId != null).length
  const withoutAccount = barbers.filter((b) => b.userId == null).length

  return { weekStats, topThisMonth, withAccount, withoutAccount, total: barbers.length }
}

export type BarberDTO       = Awaited<ReturnType<typeof listActiveBarbers>>[number]
export type BarberWithHours = Awaited<ReturnType<typeof listAllBarbersWithHours>>[number]
export type TeamStats       = Awaited<ReturnType<typeof getTeamStats>>
