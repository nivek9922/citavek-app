import 'server-only'
import { cache } from 'react'
import { db } from '@/server/db'

export const listActiveServices = cache(async (organizationId: string) => {
  return db.service.findMany({
    where: { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, description: true,
      durationMin: true, priceCop: true, category: true, imageUrl: true,
    },
  })
})

export type ServiceDTO = Awaited<ReturnType<typeof listActiveServices>>[number]
