import { computeProgress, computeRewardDiscount, type LoyaltyProgress, type RewardLine } from '../domain/loyalty'
import type { LoyaltyRepository } from '../domain/ports/loyalty-repository'

export interface GetLoyaltyStatusInput {
  organizationId: string
  customerPhone:  string
  lines?:         RewardLine[] // servicios seleccionados (para estimar el descuento)
}

export interface LoyaltyStatusView {
  progress:          LoyaltyProgress
  rewardDiscountCop: number // descuento estimado para los servicios seleccionados (0 si no aplica)
}

/**
 * Estado del cliente en el programa para el booking. Retorna `null` cuando no hay
 * nada que mostrar: programa inactivo/inexistente o cliente sin historial (no se
 * revela que el sistema existe hasta que haya progreso). Cuando hay recompensa
 * pendiente, estima el descuento server-side sobre los servicios seleccionados.
 */
export async function getLoyaltyStatus(
  repo: LoyaltyRepository,
  input: GetLoyaltyStatusInput,
): Promise<LoyaltyStatusView | null> {
  const program = await repo.getProgram(input.organizationId)
  if (!program || !program.isActive) return null

  const card = await repo.getCard(input.organizationId, input.customerPhone)
  if (!card || (card.totalVisits === 0 && !card.rewardPending)) return null

  const progress = computeProgress(card, program, program.freeServiceName)
  const rewardDiscountCop = card.rewardPending ? computeRewardDiscount(program, input.lines ?? []) : 0

  return { progress, rewardDiscountCop }
}
