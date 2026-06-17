import { addDays } from 'date-fns'
import type { SubscriptionsRepository } from '../domain/ports/subscriptions-repository'
import { SubscriptionError } from './activate-subscription'

export interface ExtendTrialInput {
  organizationId: string
  days:           number   // días a sumar
  now?:           Date
}

/**
 * Super Admin extiende el trial: suma `days` al vencimiento. Si el trial ya venció,
 * parte desde hoy (no regala días pasados). Deja la suscripción en `trial`.
 */
export async function extendTrial(
  repo:  SubscriptionsRepository,
  input: ExtendTrialInput,
): Promise<void> {
  if (input.days <= 0) throw new SubscriptionError('Los días a extender deben ser mayores a cero.')

  const now = input.now ?? new Date()
  const sub = await repo.findByOrg(input.organizationId)
  if (!sub) throw new SubscriptionError('La organización no tiene suscripción.')

  // Base = el vencimiento actual si aún es futuro; si ya venció (o no existe), hoy.
  const base = sub.trialEndsAt && sub.trialEndsAt > now ? sub.trialEndsAt : now
  await repo.extendTrial(input.organizationId, addDays(base, input.days))
}
