import { subDays } from 'date-fns'
import type { SubscriptionsRepository, AffectedOrg } from '../domain/ports/subscriptions-repository'
import { GRACE_PERIOD_DAYS } from '../domain/subscription'

export interface LifecycleResult {
  /** active vencidos → grace */
  periodsToGrace:   AffectedOrg[]
  /** trials vencidos → grace */
  trialsToGrace:    AffectedOrg[]
  /** grace agotados (>5 días) → suspended */
  graceToSuspended: AffectedOrg[]
}

/**
 * Barrido diario del ciclo de vida (lo dispara el cron). Tres transiciones sobre
 * conjuntos de estado disjuntos (active / trial / grace), seguras en paralelo:
 *
 *  1. active + currentPeriodEnd <= now  → grace (graceStartedAt = now)
 *  2. trial  + trialEndsAt      <= now  → grace (graceStartedAt = now)
 *  3. grace  + graceStartedAt <= now-5d → suspended
 *
 * Las recién pasadas a grace (graceStartedAt = now) NO caen en (3) porque el corte
 * es now-5d. Devuelve los orgs afectados para invalidar caché en el delivery layer.
 */
export async function runSubscriptionLifecycle(
  repo: SubscriptionsRepository,
  now:  Date = new Date(),
): Promise<LifecycleResult> {
  const graceCutoff = subDays(now, GRACE_PERIOD_DAYS)

  const [periodsToGrace, trialsToGrace, graceToSuspended] = await Promise.all([
    repo.expireActivePeriods(now),
    repo.expireTrials(now),
    repo.suspendExpiredGrace(graceCutoff),
  ])

  return { periodsToGrace, trialsToGrace, graceToSuspended }
}
