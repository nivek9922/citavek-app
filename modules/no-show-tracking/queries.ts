import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { prismaNoShowRepository as repo } from './infrastructure/prisma-no-show-repository'
import type { NoShowPolicy, NoShowOwnerStats } from './domain/ports/no-show-repository'

const WINDOW_DAYS = 90

function monthStartUTC(timezone: string): Date {
  const local = toZonedTime(new Date(), timezone)
  const month = String(local.getMonth() + 1).padStart(2, '0')
  return fromZonedTime(`${local.getFullYear()}-${month}-01T00:00:00`, timezone)
}

/** Configuración de la política del tenant. Cacheada hasta que `no-show-policy:${orgId}` se invalide. */
export async function getNoShowPolicy(organizationId: string): Promise<NoShowPolicy | null> {
  'use cache'
  cacheTag(`no-show-policy:${organizationId}`)
  cacheLife('max')
  return repo.getPolicy(organizationId)
}

/**
 * Set de teléfonos actualmente en riesgo para el tenant.
 * Cacheado con frescura `minutes` para reflejarse rápido tras un nuevo no_show o perdón.
 */
export async function getAtRiskPhones(organizationId: string): Promise<Set<string>> {
  'use cache'
  cacheTag(`no-show-risk:${organizationId}`)
  cacheLife('minutes')
  const policy = await repo.getPolicy(organizationId)
  if (!policy?.isActive) return new Set()
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  return repo.getAtRiskPhones(organizationId, policy.strikeThreshold, since)
}

/** Estadísticas del panel del owner. Frescura `minutes`. */
export async function getNoShowOwnerStats(organizationId: string, timezone: string): Promise<NoShowOwnerStats> {
  'use cache'
  cacheTag(`no-show-stats:${organizationId}`)
  cacheLife('minutes')
  return repo.getOwnerStats(organizationId, monthStartUTC(timezone))
}
