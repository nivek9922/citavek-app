import type { SubscriptionsRepository } from '../domain/ports/subscriptions-repository'

/** Super Admin suspende manualmente la suscripción (sin acceso a crear citas). */
export async function suspendSubscription(
  repo:           SubscriptionsRepository,
  organizationId: string,
): Promise<void> {
  await repo.suspend(organizationId)
}
