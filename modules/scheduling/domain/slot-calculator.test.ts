import { describe, it, expect } from 'vitest'
import { computeAvailableSlots, type WorkingHourInput, type BusySlot } from './slot-calculator'

const TZ = 'America/Bogota'

// Jornada 9:00–20:00 todos los días (cubre cualquier día de la semana).
const fullWeek: WorkingHourInput[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  startMin:  540,  // 09:00
  endMin:    1200, // 20:00
}))

// 30 días en el futuro → ningún slot cae en el pasado (no interfiere el filtro).
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60_000)

describe('computeAvailableSlots', () => {
  it('devuelve [] si el barbero no trabaja ese día', () => {
    const slots = computeAvailableSlots({
      date: futureDate, timezone: TZ, workingHours: [], existingSlots: [], durationMin: 30,
    })
    expect(slots).toEqual([])
  })

  it('genera slots de 30 min en jornada 9:00–20:00 (servicio 30 min)', () => {
    const slots = computeAvailableSlots({
      date: futureDate, timezone: TZ, workingHours: fullWeek, existingSlots: [],
      durationMin: 30, stepMin: 30,
    })
    // 09:00 … 19:30 → 22 slots
    expect(slots).toHaveLength(22)
    // ordenados y separados exactamente 30 minutos
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].getTime() - slots[i - 1].getTime()).toBe(30 * 60_000)
    }
  })

  it('un servicio de 60 min cabe menos veces', () => {
    const slots = computeAvailableSlots({
      date: futureDate, timezone: TZ, workingHours: fullWeek, existingSlots: [],
      durationMin: 60, stepMin: 30,
    })
    // 09:00 … 19:00 → 21 slots
    expect(slots).toHaveLength(21)
  })

  it('excluye un slot que solapa con una cita existente', () => {
    const free = computeAvailableSlots({
      date: futureDate, timezone: TZ, workingHours: fullWeek, existingSlots: [],
      durationMin: 30, stepMin: 30,
    })
    const target = free[5]
    const busy: BusySlot[] = [{ startAt: target, endAt: new Date(target.getTime() + 30 * 60_000) }]

    const withBusy = computeAvailableSlots({
      date: futureDate, timezone: TZ, workingHours: fullWeek, existingSlots: busy,
      durationMin: 30, stepMin: 30,
    })

    expect(withBusy).toHaveLength(free.length - 1)
    expect(withBusy.some((s) => s.getTime() === target.getTime())).toBe(false)
  })
})
