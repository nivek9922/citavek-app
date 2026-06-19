import type { LoyaltyProgramConfig } from '../domain/loyalty'
import type { LoyaltyRepository } from '../domain/ports/loyalty-repository'

export interface GetRedeemableRewardInput {
  organizationId: string
  customerPhone:  string
}

/**
 * Lee server-side si el cliente tiene una recompensa pendiente y, de ser así,
 * devuelve la config del programa para calcular el descuento. El cliente nunca
 * declara que tiene recompensa: siempre se deriva de la tarjeta real.
 */
export async function getRedeemableReward(
  repo: LoyaltyRepository,
  input: GetRedeemableRewardInput,
): Promise<{ program: LoyaltyProgramConfig } | null> {
  const program = await repo.getProgram(input.organizationId)
  if (!program || !program.isActive) return null

  const card = await repo.getCard(input.organizationId, input.customerPhone)
  if (!card || !card.rewardPending) return null

  return { program }
}

export interface RedeemRewardInput {
  organizationId: string
  customerPhone:  string
  rewardType:     LoyaltyProgramConfig['rewardType']
  discountCop:    number
  appointmentId?: string | null
}

/**
 * Marca la recompensa pendiente como usada y registra el canje. Idempotente: el repo
 * solo canjea si la tarjeta sigue con `rewardPending`. Retorna true si se canjeó.
 */
export async function redeemReward(
  repo: LoyaltyRepository,
  input: RedeemRewardInput,
): Promise<boolean> {
  return repo.consumeReward({
    organizationId: input.organizationId,
    customerPhone:  input.customerPhone,
    rewardType:     input.rewardType,
    discountCop:    input.discountCop,
    appointmentId:  input.appointmentId ?? null,
  })
}
