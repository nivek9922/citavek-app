import 'server-only'
import { cache } from 'react'
import { db } from '@/server/db'

const serviceSelect = {
  id: true, name: true, description: true, durationMin: true,
  priceCop: true, category: true, imageUrl: true, active: true, sortOrder: true,
} as const

/** Servicios activos (página pública). */
export const listActiveServices = cache(async (organizationId: string) => {
  return db.service.findMany({
    where:   { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select:  serviceSelect,
  })
})

/** Todos los servicios incluyendo inactivos (panel de gestión). */
export const listAllServices = cache(async (organizationId: string) => {
  return db.service.findMany({
    where:   { organizationId },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select:  serviceSelect,
  })
})

export type ServiceDTO = Awaited<ReturnType<typeof listActiveServices>>[number]
