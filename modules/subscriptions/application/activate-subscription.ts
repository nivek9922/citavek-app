import { addMonths } from 'date-fns'
import type { SubscriptionsRepository } from '../domain/ports/subscriptions-repository'

export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

export interface ActivateSubscriptionInput {
  organizationId: string
  amountCop:      number
  paidAt:         Date
  paymentMethod:  string
}

/**
 * Super Admin confirma un pago manual → suscripción `active`.
 * El período cubre 1 mes desde la fecha de pago. Limpia el estado de gracia.
 * En Fase 2 el webhook de Mercado Pago llamará a este mismo use case.
 */
export async function activateSubscription(
  repo:  SubscriptionsRepository,
  input: ActivateSubscriptionInput,
): Promise<void> {
  if (input.amountCop <= 0) throw new SubscriptionError('El monto del pago debe ser mayor a cero.')

  await repo.activate({
    organizationId: input.organizationId,
    amountCop:      input.amountCop,
    paidAt:         input.paidAt,
    periodStart:    input.paidAt,
    periodEnd:      addMonths(input.paidAt, 1),
    paymentMethod:  input.paymentMethod,
  })
}
