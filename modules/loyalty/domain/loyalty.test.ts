import { describe, it, expect } from 'vitest'
import {
  computeProgress,
  computeRewardDiscount,
  describeReward,
  applyCompletedVisit,
  type LoyaltyProgramConfig,
  type LoyaltyCardState,
} from './loyalty'

// ── Helpers ──────────────────────────────────────────────────────────────────

function program(over: Partial<LoyaltyProgramConfig> = {}): LoyaltyProgramConfig {
  return {
    isActive:       true,
    requiredVisits: 5,
    rewardType:     'FREE_NEXT_VISIT',
    discountPct:    null,
    discountAmount: null,
    freeServiceId:  null,
    ...over,
  }
}

function card(over: Partial<LoyaltyCardState> = {}): LoyaltyCardState {
  return { completedVisits: 0, totalVisits: 0, rewardsEarned: 0, rewardPending: false, ...over }
}

// ── computeProgress ──────────────────────────────────────────────────────────

describe('computeProgress', () => {
  it('cliente con 0 visitas', () => {
    const p = computeProgress(card(), program({ requiredVisits: 5 }))
    expect(p.completedVisits).toBe(0)
    expect(p.requiredVisits).toBe(5)
    expect(p.remaining).toBe(5)
    expect(p.percentage).toBe(0)
    expect(p.isNearReward).toBe(false)
    expect(p.rewardPending).toBe(false)
  })

  it('cliente a 1 visita de la recompensa → isNearReward', () => {
    const p = computeProgress(card({ completedVisits: 4 }), program({ requiredVisits: 5 }))
    expect(p.remaining).toBe(1)
    expect(p.percentage).toBe(80)
    expect(p.isNearReward).toBe(true)
  })

  it('cliente con recompensa pendiente', () => {
    const p = computeProgress(card({ completedVisits: 0, rewardPending: true }), program())
    expect(p.rewardPending).toBe(true)
    expect(p.isNearReward).toBe(false)
  })

  it('acota requiredVisits a >= 1 (sin división por cero)', () => {
    const p = computeProgress(card(), program({ requiredVisits: 0 }))
    expect(p.requiredVisits).toBe(1)
    expect(Number.isFinite(p.percentage)).toBe(true)
  })

  it('incluye la descripción de la recompensa', () => {
    const p = computeProgress(card(), program({ rewardType: 'DISCOUNT_PCT', discountPct: 50 }))
    expect(p.rewardDescription).toBe('50% de descuento')
  })
})

// ── describeReward (todos los tipos) ────────────────────────────────────────

describe('describeReward', () => {
  it('FREE_NEXT_VISIT', () => {
    expect(describeReward(program({ rewardType: 'FREE_NEXT_VISIT' }))).toBe('Próxima cita gratis')
  })
  it('DISCOUNT_PCT', () => {
    expect(describeReward(program({ rewardType: 'DISCOUNT_PCT', discountPct: 30 }))).toBe('30% de descuento')
  })
  it('DISCOUNT_AMOUNT', () => {
    const desc = describeReward(program({ rewardType: 'DISCOUNT_AMOUNT', discountAmount: 10000 }))
    expect(desc).toContain('descuento')
    expect(desc).toMatch(/10\.000/)
  })
  it('FREE_SERVICE con nombre', () => {
    expect(describeReward(program({ rewardType: 'FREE_SERVICE', freeServiceId: 'svc1' }), 'Cejas')).toBe('Cejas gratis')
  })
  it('FREE_SERVICE sin nombre → genérico', () => {
    expect(describeReward(program({ rewardType: 'FREE_SERVICE', freeServiceId: 'svc1' }))).toBe('Un servicio gratis')
  })
})

// ── computeRewardDiscount (todos los tipos) ─────────────────────────────────

describe('computeRewardDiscount', () => {
  const lines = [
    { serviceId: 'corte', priceCop: 25000 },
    { serviceId: 'cejas', priceCop: 10000 },
  ]

  it('FREE_NEXT_VISIT → total completo', () => {
    expect(computeRewardDiscount(program({ rewardType: 'FREE_NEXT_VISIT' }), lines)).toBe(35000)
  })

  it('DISCOUNT_PCT → porcentaje del total (floor)', () => {
    expect(computeRewardDiscount(program({ rewardType: 'DISCOUNT_PCT', discountPct: 50 }), lines)).toBe(17500)
  })

  it('DISCOUNT_AMOUNT → monto fijo acotado al total', () => {
    expect(computeRewardDiscount(program({ rewardType: 'DISCOUNT_AMOUNT', discountAmount: 10000 }), lines)).toBe(10000)
    // nunca excede el total
    expect(computeRewardDiscount(program({ rewardType: 'DISCOUNT_AMOUNT', discountAmount: 99999999 }), lines)).toBe(35000)
  })

  it('FREE_SERVICE → precio de la línea premiada cuando está en el carrito', () => {
    expect(computeRewardDiscount(program({ rewardType: 'FREE_SERVICE', freeServiceId: 'cejas' }), lines)).toBe(10000)
  })

  it('FREE_SERVICE → 0 si el servicio premiado NO está en el carrito (no se consume)', () => {
    expect(computeRewardDiscount(program({ rewardType: 'FREE_SERVICE', freeServiceId: 'mascarilla' }), lines)).toBe(0)
  })

  it('carrito vacío / total 0 → sin descuento', () => {
    expect(computeRewardDiscount(program({ rewardType: 'FREE_NEXT_VISIT' }), [])).toBe(0)
  })
})

// ── applyCompletedVisit ──────────────────────────────────────────────────────

describe('applyCompletedVisit', () => {
  it('suma una visita sin alcanzar el umbral', () => {
    const next = applyCompletedVisit(card({ completedVisits: 2, totalVisits: 2 }), program({ requiredVisits: 5 }))
    expect(next.completedVisits).toBe(3)
    expect(next.totalVisits).toBe(3)
    expect(next.rewardPending).toBe(false)
    expect(next.rewardsEarned).toBe(0)
  })

  it('al alcanzar el umbral activa la recompensa y resetea el contador', () => {
    const next = applyCompletedVisit(card({ completedVisits: 4, totalVisits: 4 }), program({ requiredVisits: 5 }))
    expect(next.completedVisits).toBe(0)
    expect(next.totalVisits).toBe(5)
    expect(next.rewardPending).toBe(true)
    expect(next.rewardsEarned).toBe(1)
  })

  it('no acumula una segunda recompensa si ya hay una pendiente', () => {
    const next = applyCompletedVisit(card({ completedVisits: 4, totalVisits: 9, rewardsEarned: 1, rewardPending: true }), program({ requiredVisits: 5 }))
    expect(next.completedVisits).toBe(5) // sigue contando, pero no resetea ni suma recompensa
    expect(next.totalVisits).toBe(10)
    expect(next.rewardPending).toBe(true)
    expect(next.rewardsEarned).toBe(1)
  })
})
