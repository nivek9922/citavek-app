import { describe, it, expect } from 'vitest'
import { computeKPIs, type AppointmentSummary, type BarberSummary } from './kpi-calculator'

const barbers: BarberSummary[] = [
  { id: 'brb-1', displayName: 'Carlos Ramírez', nickname: 'Carlitos' },
  { id: 'brb-2', displayName: 'Pedro Gómez',   nickname: null },
]

function apt(
  status: string,
  priceCop: number,
  barberId = 'brb-1',
): AppointmentSummary {
  return { status, priceCop, barberId }
}

describe('computeKPIs', () => {
  it('earningsToday suma solo las citas completadas', () => {
    const apts = [
      apt('completed',  30000),
      apt('completed',  45000),
      apt('confirmed',  25000), // no cuenta
      apt('cancelled',  20000), // no cuenta
      apt('no_show',    15000), // no cuenta
    ]
    const { earningsToday } = computeKPIs(apts, [], barbers)
    expect(earningsToday).toBe(75000)
  })

  it('cutsToday cuenta solo las citas completadas', () => {
    const apts = [
      apt('completed', 30000),
      apt('completed', 45000),
      apt('confirmed', 25000),
    ]
    const { cutsToday } = computeKPIs(apts, [], barbers)
    expect(cutsToday).toBe(2)
  })

  it('pendingToday cuenta solo las citas confirmadas', () => {
    const apts = [
      apt('confirmed', 25000),
      apt('confirmed', 30000),
      apt('pending',   20000),  // no es "confirmed"
      apt('completed', 35000),  // no cuenta
    ]
    const { pendingToday } = computeKPIs(apts, [], barbers)
    expect(pendingToday).toBe(2)
  })

  it('earningsWeek suma todas las citas completadas de la semana', () => {
    const weekApts = [{ priceCop: 50000 }, { priceCop: 70000 }, { priceCop: 30000 }]
    const { earningsWeek } = computeKPIs([], weekApts, barbers)
    expect(earningsWeek).toBe(150000)
  })

  it('topBarber es el barbero con más citas hoy', () => {
    const apts = [
      apt('completed', 30000, 'brb-1'),
      apt('completed', 45000, 'brb-1'),
      apt('confirmed', 25000, 'brb-2'),
    ]
    const { topBarber } = computeKPIs(apts, [], barbers)
    expect(topBarber?.id).toBe('brb-1')
  })

  it('topBarber es null cuando no hay citas hoy', () => {
    const { topBarber } = computeKPIs([], [], barbers)
    expect(topBarber).toBeNull()
  })

  it('topBarber muestra el display name y nickname correctamente', () => {
    const apts = [apt('completed', 30000, 'brb-2')]
    const { topBarber } = computeKPIs(apts, [], barbers)
    expect(topBarber?.displayName).toBe('Pedro Gómez')
    expect(topBarber?.nickname).toBeNull()
  })

  it('devuelve ceros cuando no hay citas', () => {
    const result = computeKPIs([], [], barbers)
    expect(result.earningsToday).toBe(0)
    expect(result.pendingToday).toBe(0)
    expect(result.cutsToday).toBe(0)
    expect(result.earningsWeek).toBe(0)
  })

  it('las citas canceladas no afectan ningún KPI', () => {
    const apts = [
      apt('cancelled', 100000, 'brb-1'),
      apt('cancelled', 200000, 'brb-2'),
    ]
    const result = computeKPIs(apts, [], barbers)
    // canceladas SÍ cuentan para topBarber (se registran en el conteo de citas del día)
    // pero NO para earnings ni cutsToday ni pendingToday
    expect(result.earningsToday).toBe(0)
    expect(result.cutsToday).toBe(0)
    expect(result.pendingToday).toBe(0)
  })

  it('todas las métricas son independientes entre sí', () => {
    const todayApts = [
      apt('completed', 40000, 'brb-1'),
      apt('confirmed', 35000, 'brb-2'),
      apt('completed', 50000, 'brb-1'),
    ]
    const weekApts  = [{ priceCop: 120000 }, { priceCop: 80000 }]
    const result    = computeKPIs(todayApts, weekApts, barbers)

    expect(result.earningsToday).toBe(90000)
    expect(result.pendingToday).toBe(1)
    expect(result.cutsToday).toBe(2)
    expect(result.earningsWeek).toBe(200000)
    expect(result.topBarber?.id).toBe('brb-1')
  })
})
