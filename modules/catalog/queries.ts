import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { db } from '@/server/db'

const serviceSelect = {
  id: true, name: true, description: true, durationMin: true,
  priceCop: true, category: true, imageUrl: true, active: true, sortOrder: true,
} as const

/** Servicios activos (página pública). Cacheado hasta que `services:${orgId}` se invalide. */
export async function listActiveServices(organizationId: string) {
  'use cache'
  cacheTag(`services:${organizationId}`)
  cacheLife('max')
  return db.service.findMany({
    where:   { organizationId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select:  serviceSelect,
  })
}

/** Todos los servicios incluyendo inactivos (panel). Mismo tag que listActiveServices. */
export async function listAllServices(organizationId: string) {
  'use cache'
  cacheTag(`services:${organizationId}`)
  cacheLife('max')
  return db.service.findMany({
    where:   { organizationId },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select:  serviceSelect,
  })
}

export type ServiceDTO = Awaited<ReturnType<typeof listActiveServices>>[number]
