import type { RewardTypeValue } from '../domain/loyalty'
import type { LoyaltyRepository } from '../domain/ports/loyalty-repository'

export interface UpsertLoyaltyProgramInput {
  organizationId: string
  isActive:       boolean
  requiredVisits: number
  rewardType:     RewardTypeValue
  discountPct:    number | null
  discountAmount: number | null
  freeServiceId:  string | null
}

export type UpsertLoyaltyProgramResult = { ok: true } | { ok: false; error: string }

/**
 * Crea o edita la configuración del programa (1:1 con la org). Valida la coherencia
 * de la recompensa y normaliza a null los campos que no aplican al tipo elegido.
 */
export async function upsertLoyaltyProgram(
  repo: LoyaltyRepository,
  input: UpsertLoyaltyProgramInput,
): Promise<UpsertLoyaltyProgramResult> {
  if (input.requiredVisits < 1 || input.requiredVisits > 20) {
    return { ok: false, error: 'Las visitas requeridas deben estar entre 1 y 20.' }
  }

  if (input.rewardType === 'DISCOUNT_PCT') {
    if (!input.discountPct || input.discountPct < 1 || input.discountPct > 100) {
      return { ok: false, error: 'El porcentaje de descuento debe estar entre 1 y 100.' }
    }
  }

  if (input.rewardType === 'DISCOUNT_AMOUNT') {
    if (!input.discountAmount || input.discountAmount <= 0) {
      return { ok: false, error: 'El monto del descuento debe ser mayor a 0.' }
    }
  }

  if (input.rewardType === 'FREE_SERVICE') {
    if (!input.freeServiceId) {
      return { ok: false, error: 'Selecciona el servicio gratis.' }
    }
    if (!(await repo.isActiveService(input.organizationId, input.freeServiceId))) {
      return { ok: false, error: 'El servicio seleccionado no está disponible.' }
    }
  }

  await repo.upsertProgram(input.organizationId, {
    isActive:       input.isActive,
    requiredVisits: input.requiredVisits,
    rewardType:     input.rewardType,
    discountPct:    input.rewardType === 'DISCOUNT_PCT' ? input.discountPct : null,
    discountAmount: input.rewardType === 'DISCOUNT_AMOUNT' ? input.discountAmount : null,
    freeServiceId:  input.rewardType === 'FREE_SERVICE' ? input.freeServiceId : null,
  })

  return { ok: true }
}
