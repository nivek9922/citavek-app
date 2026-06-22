import { describe, it, expect } from 'vitest'
import { computeRiskStatus, type StrikeRecord } from './no-show'

const NOW = new Date('2026-06-22T12:00:00Z')
const THRESHOLD = 3

function makeStrike(daysAgo: number, forgiven = false): StrikeRecord {
  const createdAt = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return { id: `s-${daysAgo}`, createdAt, forgiven, appointmentId: `apt-${daysAgo}` }
}

describe('computeRiskStatus', () => {
  it('sin strikes → isAtRisk false', () => {
    const result = computeRiskStatus([], THRESHOLD, true, NOW)
    expect(result.isAtRisk).toBe(false)
    expect(result.activeStrikes).toBe(0)
  })

  it('todos los strikes perdonados → isAtRisk false', () => {
    const strikes = [makeStrike(5, true), makeStrike(10, true), makeStrike(20, true)]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.isAtRisk).toBe(false)
    expect(result.activeStrikes).toBe(0)
  })

  it('strikes dentro de la ventana de 90 días → cuentan', () => {
    const strikes = [makeStrike(1), makeStrike(30), makeStrike(89)]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.activeStrikes).toBe(3)
    expect(result.isAtRisk).toBe(true)
  })

  it('strikes de hace más de 90 días → no cuentan', () => {
    const strikes = [makeStrike(91), makeStrike(120), makeStrike(365)]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.activeStrikes).toBe(0)
    expect(result.isAtRisk).toBe(false)
  })

  it('activeStrikes === threshold → isAtRisk true (umbral exacto activa la alerta)', () => {
    const strikes = [makeStrike(5), makeStrike(15), makeStrike(25)]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.activeStrikes).toBe(3)
    expect(result.isAtRisk).toBe(true)
  })

  it('activeStrikes < threshold → isAtRisk false', () => {
    const strikes = [makeStrike(5), makeStrike(15)]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.activeStrikes).toBe(2)
    expect(result.isAtRisk).toBe(false)
  })

  it('política inactiva → isAtRisk false aunque haya strikes suficientes', () => {
    const strikes = [makeStrike(1), makeStrike(10), makeStrike(20)]
    const result = computeRiskStatus(strikes, THRESHOLD, false, NOW)
    expect(result.isAtRisk).toBe(false)
    expect(result.activeStrikes).toBe(0)
  })

  it('mix de strikes: dentro/fuera/perdonados → solo cuenta activos en ventana', () => {
    const strikes = [
      makeStrike(1),         // activo, dentro — cuenta
      makeStrike(30),        // activo, dentro — cuenta
      makeStrike(91),        // activo, pero fuera de ventana — no cuenta
      makeStrike(5, true),   // perdonado — no cuenta
    ]
    const result = computeRiskStatus(strikes, THRESHOLD, true, NOW)
    expect(result.activeStrikes).toBe(2)
    expect(result.isAtRisk).toBe(false)
  })
})
