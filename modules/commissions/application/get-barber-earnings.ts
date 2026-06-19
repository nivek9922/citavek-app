import type { CommissionsRepository } from '../domain/ports/commissions-repository'
import { computeCommission } from '../domain/commission'

export interface BarberEarningsInput {
  organizationId: string
  barberId:       string
  start:          Date
  end:            Date
}

export interface BarberEarnings {
  appointmentCount: number
  grossRevenueCop:  number
  commissionCop:    number
}

/**
 * Lo que un barbero generó (facturado) y la comisión que le corresponde en un
 * período. El `barberId` debe resolverse server-side antes de llamar a este use case.
 */
export async function getBarberEarnings(
  repo: CommissionsRepository,
  input: BarberEarningsInput,
): Promise<BarberEarnings> {
  const [aggregates, config] = await Promise.all([
    repo.getAggregates(input.organizationId, input.start, input.end, input.barberId),
    repo.getConfig(input.organizationId, input.barberId),
  ])

  const agg             = aggregates[0]
  const grossRevenueCop = agg?.grossRevenueCop ?? 0
  const commissionCop   = computeCommission(
    { priceCop: grossRevenueCop, serviceCount: agg?.serviceCount ?? 0 },
    config?.config ?? null,
  )

  return {
    appointmentCount: agg?.appointmentCount ?? 0,
    grossRevenueCop,
    commissionCop,
  }
}
