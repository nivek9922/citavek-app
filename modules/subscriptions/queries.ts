import 'server-only'
import { db } from '@/server/db'
import { BASIC_PRICE_COP } from '@/shared/constants/billing'
import { TRIAL_ENDING_SOON_DAYS, type SubscriptionStatus } from './domain/subscription'
import { getSubscriptionStatus } from './application/get-subscription-status'
import { prismaSubscriptionsRepository as repo } from './infrastructure/prisma-subscriptions-repository'

/**
 * Super Admin: estado de la suscripción de UNA org (registro + acceso + banner).
 * Sin `use cache`: lo refresca `router.refresh()` tras una acción del Super Admin.
 */
export async function getSubscriptionForAdmin(organizationId: string) {
  return getSubscriptionStatus(repo, organizationId)
}

export interface SubscriptionMetrics {
  byStatus:              Record<SubscriptionStatus, number>
  collectedThisMonthCop: number
  trialsEndingSoon:      number
  projectedMrrCop:       number
}

const EMPTY_BY_STATUS: Record<SubscriptionStatus, number> = {
  trial: 0, active: 0, grace: 0, suspended: 0, cancelled: 0,
}

/** Super Admin: métricas de MRR manual para la Torre de Control (cross-tenant, agregado en BD). */
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  const now        = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const soonCutoff = new Date(now.getTime() + TRIAL_ENDING_SOON_DAYS * 86_400_000)

  const [grouped, collected, trialsEndingSoon] = await Promise.all([
    db.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    db.subscription.aggregate({
      where: { status: 'active', lastPaymentAt: { gte: monthStart } },
      _sum:  { lastPaymentAmount: true },
    }),
    db.subscription.count({
      where: { status: 'trial', trialEndsAt: { gte: now, lte: soonCutoff } },
    }),
  ])

  const byStatus = { ...EMPTY_BY_STATUS }
  for (const row of grouped) byStatus[row.status] = row._count._all

  // Proyección: toda org que aún no canceló/suspendió, cotizando el plan básico.
  const payingIfConverted = byStatus.active + byStatus.trial + byStatus.grace

  return {
    byStatus,
    collectedThisMonthCop: collected._sum.lastPaymentAmount ?? 0,
    trialsEndingSoon,
    projectedMrrCop:       payingIfConverted * BASIC_PRICE_COP,
  }
}
