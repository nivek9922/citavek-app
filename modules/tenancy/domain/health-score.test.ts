import { describe, it, expect } from 'vitest'
import { computeHealthScore } from './health-score'

describe('computeHealthScore', () => {
  it('verde con actividad neta alta', () => {
    expect(computeHealthScore(10, 2, 30)).toEqual({ created: 10, cancelled: 2, score: 8, level: 'green' })
  })

  it('amarillo con actividad marginal', () => {
    expect(computeHealthScore(3, 0, 30)).toEqual({ created: 3, cancelled: 0, score: 3, level: 'yellow' })
  })

  it('rojo sin actividad (negocio con más de 14 días)', () => {
    expect(computeHealthScore(0, 0, 15).level).toBe('red')
  })

  it('rojo con más cancelaciones que altas (score negativo)', () => {
    const health = computeHealthScore(2, 5, 30)
    expect(health.score).toBe(-3)
    expect(health.level).toBe('red')
  })

  it('bordes exactos de los umbrales', () => {
    expect(computeHealthScore(5, 0, 30).level).toBe('green')   // score 5 = HEALTH_GREEN_MIN
    expect(computeHealthScore(4, 0, 30).level).toBe('yellow')
    expect(computeHealthScore(1, 0, 30).level).toBe('yellow')  // score 1 = HEALTH_YELLOW_MIN
    expect(computeHealthScore(1, 1, 30).level).toBe('red')     // score 0, edad > 14
  })

  it('onboarding: negocio nuevo (≤14 días) sin actividad', () => {
    expect(computeHealthScore(0, 0, 0).level).toBe('onboarding')
    expect(computeHealthScore(0, 0, 14).level).toBe('onboarding')
  })

  it('no onboarding si tiene actividad aunque sea nuevo', () => {
    expect(computeHealthScore(3, 0, 5).level).toBe('yellow')
  })

  it('rojo exactamente en el límite de 15 días sin actividad', () => {
    expect(computeHealthScore(0, 0, 15).level).toBe('red')
  })
})
