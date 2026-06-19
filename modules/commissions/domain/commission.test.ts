import { describe, it, expect } from 'vitest'
import {
  computeCommission,
  computeSettlementPeriod,
  type CommissionConfig,
} from './commission'

// ── Helpers ──────────────────────────────────────────────────────────────────

function percentage(pct: number): CommissionConfig {
  return { commissionType: 'PERCENTAGE', percentage: pct, fixedAmount: null }
}

function fixed(amount: number): CommissionConfig {
  return { commissionType: 'FIXED_PER_SERVICE', percentage: null, fixedAmount: amount }
}

// ── computeCommission: PERCENTAGE ─────────────────────────────────────────────

describe('computeCommission · PERCENTAGE', () => {
  it('45% de $30.000 = $13.500', () => {
    expect(computeCommission({ priceCop: 30_000, serviceCount: 1 }, percentage(45))).toBe(13_500)
  })

  it('50% de $20.000 = $10.000', () => {
    expect(computeCommission({ priceCop: 20_000, serviceCount: 2 }, percentage(50))).toBe(10_000)
  })

  it('100% devuelve el total', () => {
    expect(computeCommission({ priceCop: 25_000, serviceCount: 1 }, percentage(100))).toBe(25_000)
  })

  it('redondea a COP enteros (sin centavos): 45% de $25.000 = $11.250', () => {
    expect(computeCommission({ priceCop: 25_000, serviceCount: 1 }, percentage(45))).toBe(11_250)
  })

  it('redondea correctamente cuando no es exacto: 33% de $10.000 = $3.300', () => {
    expect(computeCommission({ priceCop: 10_000, serviceCount: 1 }, percentage(33))).toBe(3_300)
  })

  it('redondea medio hacia arriba: 15% de $999 = round(149.85) = $150', () => {
    expect(computeCommission({ priceCop: 999, serviceCount: 1 }, percentage(15))).toBe(150)
  })

  it('el serviceCount es irrelevante para PERCENTAGE', () => {
    const single = computeCommission({ priceCop: 40_000, serviceCount: 1 }, percentage(40))
    const multi  = computeCommission({ priceCop: 40_000, serviceCount: 5 }, percentage(40))
    expect(single).toBe(multi)
    expect(single).toBe(16_000)
  })
})

// ── computeCommission: FIXED_PER_SERVICE ──────────────────────────────────────

describe('computeCommission · FIXED_PER_SERVICE', () => {
  it('cita de 1 servicio: $8.000 fijo = $8.000', () => {
    expect(computeCommission({ priceCop: 30_000, serviceCount: 1 }, fixed(8_000))).toBe(8_000)
  })

  it('cita de múltiples servicios: $8.000 × 3 = $24.000', () => {
    expect(computeCommission({ priceCop: 90_000, serviceCount: 3 }, fixed(8_000))).toBe(24_000)
  })

  it('el priceCop es irrelevante para FIXED_PER_SERVICE', () => {
    const a = computeCommission({ priceCop: 10_000, serviceCount: 2 }, fixed(5_000))
    const b = computeCommission({ priceCop: 99_000, serviceCount: 2 }, fixed(5_000))
    expect(a).toBe(b)
    expect(a).toBe(10_000)
  })

  it('0 servicios = $0', () => {
    expect(computeCommission({ priceCop: 0, serviceCount: 0 }, fixed(8_000))).toBe(0)
  })
})

// ── computeCommission: sin configuración ──────────────────────────────────────

describe('computeCommission · sin configuración', () => {
  it('config null → 0', () => {
    expect(computeCommission({ priceCop: 50_000, serviceCount: 3 }, null)).toBe(0)
  })

  it('PERCENTAGE con percentage null → 0', () => {
    const cfg: CommissionConfig = { commissionType: 'PERCENTAGE', percentage: null, fixedAmount: null }
    expect(computeCommission({ priceCop: 50_000, serviceCount: 1 }, cfg)).toBe(0)
  })

  it('FIXED_PER_SERVICE con fixedAmount null → 0', () => {
    const cfg: CommissionConfig = { commissionType: 'FIXED_PER_SERVICE', percentage: null, fixedAmount: null }
    expect(computeCommission({ priceCop: 50_000, serviceCount: 3 }, cfg)).toBe(0)
  })
})

// ── computeCommission: cálculo agregado (cierre/liquidación) ───────────────────

describe('computeCommission · agregado por barbero', () => {
  it('PERCENTAGE sobre el total facturado: 45% de $480.000 = $216.000', () => {
    // mismo resultado tratando el período como un solo input agregado
    expect(computeCommission({ priceCop: 480_000, serviceCount: 21 }, percentage(45))).toBe(216_000)
  })

  it('FIXED sobre el total de servicios del período', () => {
    expect(computeCommission({ priceCop: 600_000, serviceCount: 20 }, fixed(7_000))).toBe(140_000)
  })
})

// ── computeSettlementPeriod ───────────────────────────────────────────────────

describe('computeSettlementPeriod · custom', () => {
  const tz = 'America/Bogota'

  it('rango custom: start en 00:00 local, end en 24:00 local del último día', () => {
    const { start, end } = computeSettlementPeriod('custom', tz, '2026-06-01', '2026-06-07')
    // Bogotá es UTC-5 → 00:00 local = 05:00 UTC
    expect(start.toISOString()).toBe('2026-06-01T05:00:00.000Z')
    // fin exclusivo = 00:00 local del 8 = 05:00 UTC del 8
    expect(end.toISOString()).toBe('2026-06-08T05:00:00.000Z')
  })

  it('rango custom de un solo día abarca 24h', () => {
    const { start, end } = computeSettlementPeriod('custom', tz, '2026-06-15', '2026-06-15')
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('custom sin fechas lanza error', () => {
    expect(() => computeSettlementPeriod('custom', tz)).toThrow()
  })

  it('custom con inicio posterior al fin lanza error', () => {
    expect(() => computeSettlementPeriod('custom', tz, '2026-06-10', '2026-06-01')).toThrow()
  })
})
