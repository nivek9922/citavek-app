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

/** Todos los barberos con horarios (panel). Mismo tag que listActiveBarbers. */
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
      workingHours: { select: { dayOfWeek: true, startMin: true, endMin: true } },
    },
  })
}

export type BarberDTO       = Awaited<ReturnType<typeof listActiveBarbers>>[number]
export type BarberWithHours = Awaited<ReturnType<typeof listAllBarbersWithHours>>[number]
