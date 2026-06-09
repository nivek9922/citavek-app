import { describe, it, expect } from 'vitest'
import { fromZonedTime } from 'date-fns-tz'
import { isWithinWorkingHours } from './working-hours'

const TZ = 'America/Bogota' // UTC-5, sin DST

// Lunes 2026-06-08. Horario del lunes: 09:00–20:00 (540–1200 min).
const MONDAY_HOURS = [{ dayOfWeek: 1, startMin: 540, endMin: 1200 }]

function bogota(dateTimeLocal: string): Date {
  return fromZonedTime(dateTimeLocal, TZ)
}

describe('isWithinWorkingHours', () => {
  it('true si la cita cae completa dentro del horario', () => {
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T10:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(true)
  })

  it('false si empieza antes de la apertura', () => {
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T08:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(false)
  })

  it('false si empieza dentro pero termina después del cierre', () => {
    // 19:30 + 60 min = 20:30 > cierre 20:00
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T19:30:00'),
      durationMin:  60,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(false)
  })

  it('true en los bordes exactos del horario', () => {
    // Empieza justo a la apertura
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T09:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(true)
    // Termina justo al cierre: 19:30 + 30 min = 20:00 (fin inclusivo)
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T19:30:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(true)
  })

  it('false si el día no tiene horario definido', () => {
    // Martes con horario solo de lunes
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-09T10:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: MONDAY_HOURS,
    })).toBe(false)
  })

  it('false si el barbero no tiene ningún horario', () => {
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T10:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: [],
    })).toBe(false)
  })

  it('evalúa el día de semana en hora local, no UTC', () => {
    // Lunes 23:00 Bogota = martes 04:00 UTC. Con horario de lunes 0–1440,
    // la cita debe contar como lunes (true), no como martes (false).
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T23:00:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: [{ dayOfWeek: 1, startMin: 0, endMin: 1440 }],
    })).toBe(true)
  })

  it('false si la cita cruza la medianoche local', () => {
    // 23:45 + 30 min termina a las 00:15 del día siguiente
    expect(isWithinWorkingHours({
      startAt:      bogota('2026-06-08T23:45:00'),
      durationMin:  30,
      timezone:     TZ,
      workingHours: [{ dayOfWeek: 1, startMin: 0, endMin: 1440 }],
    })).toBe(false)
  })
})
