import type { CommissionsRepository } from '../domain/ports/commissions-repository'
import { getBarberEarnings } from './get-barber-earnings'

export interface CreateSettlementInput {
  organizationId: string
  barberId:       string
  start:          Date
  end:            Date
  paid:           boolean
  notes:          string | null
}

export type CreateSettlementResult =
  | { ok: true; data: { grossRevenueCop: number; commissionCop: number; appointmentCount: number } }
  | { ok: false; error: string }

/**
 * Congela una liquidación de un período. Recalcula el facturado/comisión server-side
 * (nunca confía en montos enviados por el cliente) y lo persiste en el histórico.
 */
export async function createSettlement(
  repo: CommissionsRepository,
  input: CreateSettlementInput,
): Promise<CreateSettlementResult> {
  if (input.end <= input.start) {
    return { ok: false, error: 'El rango de fechas de la liquidación es inválido.' }
  }

  const earnings = await getBarberEarnings(repo, {
    organizationId: input.organizationId,
    barberId:       input.barberId,
    start:          input.start,
    end:            input.end,
  })

  const ok = await repo.createSettlement(input.organizationId, {
    barberId:         input.barberId,
    periodStart:      input.start,
    periodEnd:        input.end,
    grossRevenueCop:  earnings.grossRevenueCop,
    commissionCop:    earnings.commissionCop,
    appointmentCount: earnings.appointmentCount,
    paid:             input.paid,
    paidAt:           input.paid ? new Date() : null,
    notes:            input.notes,
  })
  if (!ok) return { ok: false, error: 'El barbero no pertenece a esta barbería.' }

  return { ok: true, data: earnings }
}
