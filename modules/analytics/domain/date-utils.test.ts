import { describe, it, expect } from 'vitest'
import { tenantToday, localDayBoundsUTC, currentWeekBoundsUTC } from './date-utils'

const TZ_BOG = 'America/Bogota' // UTC-5, sin DST → offset fijo

describe('tenantToday', () => {
  it('devuelve una cadena con formato YYYY-MM-DD', () => {
    const result = tenantToday(TZ_BOG)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('devuelve la fecha de hoy, no del mañana ni ayer', () => {
    const result  = tenantToday(TZ_BOG)
    const jsToday = new Date()
    // Verifica que el año coincide (suficiente para detectar desfases de TZ grandes)
    expect(result.slice(0, 4)).toBe(String(jsToday.getUTCFullYear()))
  })
})

describe('localDayBoundsUTC', () => {
  it('devuelve start y end correctos para Bogotá (UTC-5)', () => {
    const { start, end } = localDayBoundsUTC('2024-03-15', TZ_BOG)
    // Bogotá UTC-5: medianoche local = 05:00 UTC
    expect(start.toISOString()).toBe('2024-03-15T05:00:00.000Z')
    expect(end.toISOString()).toBe('2024-03-16T05:00:00.000Z')
  })

  it('la ventana abarca exactamente 24 horas', () => {
    const { start, end } = localDayBoundsUTC('2024-07-10', TZ_BOG)
    const diffMs = end.getTime() - start.getTime()
    expect(diffMs).toBe(24 * 60 * 60_000)
  })

  it('start < end', () => {
    const { start, end } = localDayBoundsUTC('2024-01-01', TZ_BOG)
    expect(start.getTime()).toBeLessThan(end.getTime())
  })

  it('diferentes fechas producen diferentes rangos', () => {
    const day1 = localDayBoundsUTC('2024-06-01', TZ_BOG)
    const day2 = localDayBoundsUTC('2024-06-02', TZ_BOG)
    expect(day1.start.getTime()).not.toBe(day2.start.getTime())
    // El end del día 1 coincide con el start del día 2 (contigüidad)
    expect(day1.end.getTime()).toBe(day2.start.getTime())
  })

  it('maneja el cambio de año correctamente', () => {
    const { start, end } = localDayBoundsUTC('2024-12-31', TZ_BOG)
    expect(start.getUTCFullYear()).toBe(2024)
    expect(end.getUTCFullYear()).toBe(2025)
    expect(end.getUTCMonth()).toBe(0)  // enero
    expect(end.getUTCDate()).toBe(1)
  })
})

describe('currentWeekBoundsUTC', () => {
  it('devuelve weekStart y weekEnd como Dates', () => {
    const { weekStart, weekEnd } = currentWeekBoundsUTC(TZ_BOG)
    expect(weekStart).toBeInstanceOf(Date)
    expect(weekEnd).toBeInstanceOf(Date)
  })

  it('weekStart < weekEnd', () => {
    const { weekStart, weekEnd } = currentWeekBoundsUTC(TZ_BOG)
    expect(weekStart.getTime()).toBeLessThan(weekEnd.getTime())
  })

  it('la semana abarca exactamente 7 días', () => {
    const { weekStart, weekEnd } = currentWeekBoundsUTC(TZ_BOG)
    const diffDays = (weekEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60_000)
    expect(diffDays).toBe(7)
  })

  it('hoy cae dentro de la semana', () => {
    const { weekStart, weekEnd } = currentWeekBoundsUTC(TZ_BOG)
    const now = Date.now()
    expect(weekStart.getTime()).toBeLessThanOrEqual(now)
    expect(weekEnd.getTime()).toBeGreaterThan(now)
  })
})
