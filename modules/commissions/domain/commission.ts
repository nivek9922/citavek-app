// Dominio de comisiones — funciones puras, sin deps de framework ni DB.
// La comisión nunca se persiste por cita: se calcula on-demand desde el total
// facturado del barbero y su configuración. El módulo `date-utils` de analytics
// aporta utilidades puras de fecha/zona horaria (reutilizadas, no duplicadas).
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { localDayBoundsUTC, currentWeekBoundsUTC } from '@/modules/analytics/domain/date-utils'

export type CommissionTypeValue = 'PERCENTAGE' | 'FIXED_PER_SERVICE'

/** Configuración de comisión de un barbero (1:1 con Barber). */
export interface CommissionConfig {
  commissionType: CommissionTypeValue
  percentage:     number | null // 1-100 si PERCENTAGE
  fixedAmount:    number | null // COP por servicio si FIXED_PER_SERVICE
}

/**
 * Entrada del cálculo. Sirve tanto para una cita individual (serviceCount = nº de
 * servicios de la cita) como para el agregado de un barbero en un período
 * (priceCop = facturado total, serviceCount = total de servicios completados).
 * Como `priceCop` y `serviceCount` son sumables, el cálculo agregado da un único
 * redondeo por barbero y evita iterar citas en JS.
 */
export interface CommissionInput {
  priceCop:     number
  serviceCount: number
}

/**
 * Comisión en COP enteros.
 *   PERCENTAGE        → round(priceCop * percentage / 100)
 *   FIXED_PER_SERVICE → fixedAmount * serviceCount
 *   sin configuración → 0 (el owner debe configurar antes de que se calcule)
 */
export function computeCommission(input: CommissionInput, config: CommissionConfig | null): number {
  if (!config) return 0

  if (config.commissionType === 'PERCENTAGE') {
    const pct = config.percentage ?? 0
    return Math.round((Math.max(0, input.priceCop) * pct) / 100)
  }

  // FIXED_PER_SERVICE
  const fixed = config.fixedAmount ?? 0
  return fixed * Math.max(0, input.serviceCount)
}

export type SettlementPeriodKind = 'week' | 'month' | 'custom'

/**
 * Rango UTC [start, end) de un período de liquidación, en la zona horaria del tenant.
 *   week   → semana actual (lun–dom)
 *   month  → mes calendario actual
 *   custom → [customStart 00:00, customEnd 24:00) (ambas 'yyyy-MM-dd')
 */
export function computeSettlementPeriod(
  kind: SettlementPeriodKind,
  timezone: string,
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date } {
  if (kind === 'week') {
    const { weekStart, weekEnd } = currentWeekBoundsUTC(timezone)
    return { start: weekStart, end: weekEnd }
  }

  if (kind === 'month') {
    const localNow = toZonedTime(new Date(), timezone)
    const startStr = format(startOfMonth(localNow), 'yyyy-MM-dd')
    const endStr   = format(endOfMonth(localNow), 'yyyy-MM-dd')
    return {
      start: localDayBoundsUTC(startStr, timezone).start,
      end:   localDayBoundsUTC(endStr, timezone).end,
    }
  }

  // custom
  if (!customStart || !customEnd) {
    throw new Error('El rango personalizado requiere fecha inicial y final.')
  }
  if (customStart > customEnd) {
    throw new Error('La fecha inicial no puede ser posterior a la final.')
  }
  return {
    start: localDayBoundsUTC(customStart, timezone).start,
    end:   localDayBoundsUTC(customEnd, timezone).end,
  }
}
