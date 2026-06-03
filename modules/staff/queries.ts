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

export type BarberDTO = Awaited<ReturnType<typeof listActiveBarbers>>[number]
