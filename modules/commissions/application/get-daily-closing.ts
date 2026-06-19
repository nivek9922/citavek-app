import type { CommissionsRepository } from '../domain/ports/commissions-repository'
import { computeCommission } from '../domain/commission'

export interface DailyClosingInput {
  organizationId: string
  start:          Date // [start, end) — rango UTC del día en la TZ del tenant
  end:            Date
}

export interface BarberClosingRow {
  barberId:         string
  barberName:       string
  appointmentCount: number
  grossRevenueCop:  number
  commissionCop:    number
  ownerProfitCop:   number
  hasConfig:        boolean // false → comisión 0, el owner aún no configuró
}

export interface DailyClosing {
  rows:   BarberClosingRow[]
  totals: {
    appointmentCount: number
    grossRevenueCop:  number
    commissionCop:    number
    ownerProfitCop:   number
  }
}

/**
 * Cierre de caja de un día: por cada barbero activo, citas/facturado/comisión y
 * ganancia del owner. La comisión se calcula con la config de cada barbero a nivel
 * agregado (un único redondeo por barbero). Totales = suma de todos los barberos.
 */
export async function getDailyClosing(
  repo: CommissionsRepository,
  input: DailyClosingInput,
): Promise<DailyClosing> {
  const [barbers, aggregates, configs] = await Promise.all([
    repo.listActiveBarbers(input.organizationId),
    repo.getAggregates(input.organizationId, input.start, input.end),
    repo.listConfigs(input.organizationId),
  ])

  const aggByBarber    = new Map(aggregates.map((a) => [a.barberId, a]))
  const configByBarber = new Map(configs.map((c) => [c.barberId, c.config]))

  const rows: BarberClosingRow[] = barbers.map((b) => {
    const agg              = aggByBarber.get(b.id)
    const config           = configByBarber.get(b.id) ?? null
    const grossRevenueCop  = agg?.grossRevenueCop ?? 0
    const appointmentCount = agg?.appointmentCount ?? 0
    const commissionCop    = computeCommission(
      { priceCop: grossRevenueCop, serviceCount: agg?.serviceCount ?? 0 },
      config,
    )
    return {
      barberId:       b.id,
      barberName:     b.nickname ?? b.displayName,
      appointmentCount,
      grossRevenueCop,
      commissionCop,
      ownerProfitCop: grossRevenueCop - commissionCop,
      hasConfig:      config !== null,
    }
  })

  // Los que más facturaron primero; idle (0 citas) al final.
  rows.sort((a, b) => b.grossRevenueCop - a.grossRevenueCop)

  const totals = rows.reduce(
    (t, r) => ({
      appointmentCount: t.appointmentCount + r.appointmentCount,
      grossRevenueCop:  t.grossRevenueCop + r.grossRevenueCop,
      commissionCop:    t.commissionCop + r.commissionCop,
      ownerProfitCop:   t.ownerProfitCop + r.ownerProfitCop,
    }),
    { appointmentCount: 0, grossRevenueCop: 0, commissionCop: 0, ownerProfitCop: 0 },
  )

  return { rows, totals }
}
