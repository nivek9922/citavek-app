import type { SubscriptionsRepository } from '../domain/ports/subscriptions-repository'

export interface CancelSubscriptionInput {
  organizationId: string
  reason?:        string | null
  now?:           Date
}

/** Super Admin cancela definitivamente la suscripción, con motivo opcional. */
export async function cancelSubscription(
  repo:  SubscriptionsRepository,
  input: CancelSubscriptionInput,
): Promise<void> {
  await repo.cancel(input.organizationId, input.reason ?? null, input.now ?? new Date())
}
