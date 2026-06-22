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

  const existing = await repo.findOverlappingSettlement(
    input.organizationId, input.barberId, input.start, input.end,
  )
  if (existing) {
    if (existing.paid) {
      const d = (existing.paidAt ?? existing.createdAt)
        .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      return {
        ok: false,
        error: `Ya se liquidó este período el ${d}. No es posible registrar dos pagos para el mismo período.`,
      }
    }
    return {
      ok: false,
      error: 'Ya existe una liquidación pendiente para este período. Elimínala desde el historial antes de crear una nueva.',
    }
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
