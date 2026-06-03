import 'server-only'
import { cache } from 'react'
import { db } from '@/server/db'

export const listActiveBarbers = cache(async (organizationId: string) => {
  return db.barber.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    select: {
      id: true, displayName: true, nickname: true,
      avatarUrl: true, specialties: true, rating: true, reviewsCount: true,
    },
  })
})

export const listAllBarbersWithHours = cache(async (organizationId: string) => {
  return db.barber.findMany({
    where:   { organizationId },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { displayName: 'asc' }],
    select: {
      id: true, displayName: true, nickname: true, avatarUrl: true,
      specialties: true, rating: true, reviewsCount: true, active: true, sortOrder: true,
      workingHours: { select: { dayOfWeek: true, startMin: true, endMin: true } },
    },
  })
})

export type BarberDTO       = Awaited<ReturnType<typeof listActiveBarbers>>[number]
export type BarberWithHours = Awaited<ReturnType<typeof listAllBarbersWithHours>>[number]
