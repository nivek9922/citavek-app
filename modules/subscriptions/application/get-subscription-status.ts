import type { SubscriptionsRepository, SubscriptionRecord } from '../domain/ports/subscriptions-repository'
import { canOperate, deriveSubscriptionView, type SubscriptionBanner } from '../domain/subscription'

export interface SubscriptionStatusView {
  record:     SubscriptionRecord | null
  canOperate: boolean
  banner:     SubscriptionBanner
}

/**
 * Estado actual de la suscripción de una org + acceso derivado (¿puede crear citas?)
 * + banner a mostrar. Lectura única; el acceso y el banner se computan con el dominio.
 */
export async function getSubscriptionStatus(
  repo:           SubscriptionsRepository,
  organizationId: string,
  now: Date = new Date(),
): Promise<SubscriptionStatusView> {
  const record = await repo.findByOrg(organizationId)
  return {
    record,
    canOperate: canOperate(record, now),
    banner:     deriveSubscriptionView(record, now),
  }
}
