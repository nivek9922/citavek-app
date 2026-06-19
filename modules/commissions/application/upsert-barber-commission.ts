import type { CommissionsRepository } from '../domain/ports/commissions-repository'
import type { CommissionTypeValue } from '../domain/commission'

export interface UpsertBarberCommissionInput {
  organizationId: string
  barberId:       string
  commissionType: CommissionTypeValue
  percentage:     number | null
  fixedAmount:    number | null
}

export type UpsertBarberCommissionResult = { ok: true } | { ok: false; error: string }

/**
 * Configura la comisión de un barbero. Valida el rango del valor según el tipo y
 * normaliza el campo no usado a null. El repo verifica que el barbero ∈ org.
 */
export async function upsertBarberCommission(
  repo: CommissionsRepository,
  input: UpsertBarberCommissionInput,
): Promise<UpsertBarberCommissionResult> {
  if (input.commissionType === 'PERCENTAGE') {
    if (input.percentage == null || input.percentage < 1 || input.percentage > 100) {
      return { ok: false, error: 'El porcentaje debe estar entre 1 y 100.' }
    }
  } else {
    if (input.fixedAmount == null || input.fixedAmount < 1) {
      return { ok: false, error: 'El monto fijo por servicio debe ser mayor a 0.' }
    }
  }

  const ok = await repo.upsertConfig(input.organizationId, input.barberId, {
    commissionType: input.commissionType,
    percentage:     input.commissionType === 'PERCENTAGE' ? input.percentage : null,
    fixedAmount:    input.commissionType === 'FIXED_PER_SERVICE' ? input.fixedAmount : null,
  })
  if (!ok) return { ok: false, error: 'El barbero no pertenece a esta barbería.' }

  return { ok: true }
}
