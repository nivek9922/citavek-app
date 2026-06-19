import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { db } from '@/server/db'
import { prismaLoyaltyRepository as repo } from './infrastructure/prisma-loyalty-repository'
import type { LoyaltyProgramRecord, LoyaltyOwnerStats } from './domain/ports/loyalty-repository'

/** Configuración del programa del tenant. Cacheada hasta que `loyalty-program:${orgId}` se invalide. */
export async function getLoyaltyProgram(organizationId: string): Promise<LoyaltyProgramRecord | null> {
  'use cache'
  cacheTag(`loyalty-program:${organizationId}`)
  cacheLife('max')
  return repo.getProgram(organizationId)
}

/** Primer día del mes en curso (TZ del tenant) en UTC. */
function monthStartUTC(timezone: string): Date {
  const local = toZonedTime(new Date(), timezone)
  const month = String(local.getMonth() + 1).padStart(2, '0')
  return fromZonedTime(`${local.getFullYear()}-${month}-01T00:00:00`, timezone)
}

/** Estadísticas del programa para el panel del owner. Frescura `minutes` (datos en vivo). */
export async function getLoyaltyOwnerStats(organizationId: string, timezone: string): Promise<LoyaltyOwnerStats> {
  'use cache'
  cacheTag(`loyalty-stats:${organizationId}`)
  cacheLife('minutes')
  return repo.getOwnerStats(organizationId, monthStartUTC(timezone))
}

/** Super-admin: adopción del programa de fidelidad (Torre de Control). */
export async function getLoyaltyAdoptionStats(): Promise<{ totalActive: number; withLoyaltyActive: number }> {
  'use cache'
  cacheTag('loyalty-adoption')
  cacheLife('minutes')
  const [totalActive, withLoyaltyActive] = await Promise.all([
    db.organization.count({ where: { status: 'active' } }),
    db.loyaltyProgram.count({ where: { isActive: true, organization: { status: 'active' } } }),
  ])
  return { totalActive, withLoyaltyActive }
}
