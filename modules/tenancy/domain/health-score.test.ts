import { describe, it, expect } from 'vitest'
import { computeHealthScore } from './health-score'

describe('computeHealthScore', () => {
  it('verde con actividad neta alta', () => {
    expect(computeHealthScore(10, 2)).toEqual({ created: 10, cancelled: 2, score: 8, level: 'green' })
  })

  it('amarillo con actividad marginal', () => {
    expect(computeHealthScore(3, 0)).toEqual({ created: 3, cancelled: 0, score: 3, level: 'yellow' })
  })

  it('rojo sin actividad', () => {
    expect(computeHealthScore(0, 0).level).toBe('red')
  })

  it('rojo con más cancelaciones que altas (score negativo)', () => {
    const health = computeHealthScore(2, 5)
    expect(health.score).toBe(-3)
    expect(health.level).toBe('red')
  })

  it('bordes exactos de los umbrales', () => {
    expect(computeHealthScore(5, 0).level).toBe('green')  // score 5 = HEALTH_GREEN_MIN
    expect(computeHealthScore(4, 0).level).toBe('yellow')
    expect(computeHealthScore(1, 0).level).toBe('yellow') // score 1 = HEALTH_YELLOW_MIN
    expect(computeHealthScore(1, 1).level).toBe('red')    // score 0
  })
})
