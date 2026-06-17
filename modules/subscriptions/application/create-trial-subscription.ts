import { addDays } from 'date-fns'
import type { SubscriptionsRepository } from '../domain/ports/subscriptions-repository'
import { TRIAL_DEFAULT_DAYS } from '../domain/subscription'

export interface CreateTrialInput {
  organizationId: string
  trialDays?:     number   // default: TRIAL_DEFAULT_DAYS
  now?:           Date     // inyectable para tests
}

/**
 * Crea (o reactiva) la suscripción de una org en `trial`. Idempotente: el repo usa
 * upsert por `organizationId`, así que llamarlo de nuevo no duplica ni rompe.
 */
export async function createTrialSubscription(
  repo:  SubscriptionsRepository,
  input: CreateTrialInput,
): Promise<void> {
  const now         = input.now ?? new Date()
  const trialEndsAt = addDays(now, input.trialDays ?? TRIAL_DEFAULT_DAYS)
  await repo.createTrial(input.organizationId, trialEndsAt)
}
