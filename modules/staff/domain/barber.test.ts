import { describe, it, expect } from 'vitest'
import { validateBarber, validateWorkingHours, InvalidBarberError } from './barber'

describe('validateBarber', () => {
  it('displayName vacío lanza InvalidBarberError', () => {
    expect(() => validateBarber({ displayName: '' })).toThrow(InvalidBarberError)
  })

  it('displayName con solo espacios lanza', () => {
    expect(() => validateBarber({ displayName: '   ' })).toThrow(InvalidBarberError)
  })

  it('displayName válido no lanza', () => {
    expect(() => validateBarber({ displayName: 'Carlos' })).not.toThrow()
  })
})

describe('validateWorkingHours', () => {
  it('startMin === endMin lanza', () => {
    expect(() => validateWorkingHours([{ dayOfWeek: 1, startMin: 480, endMin: 480 }]))
      .toThrow(InvalidBarberError)
  })

  it('startMin > endMin lanza', () => {
    expect(() => validateWorkingHours([{ dayOfWeek: 1, startMin: 600, endMin: 480 }]))
      .toThrow(InvalidBarberError)
  })

  it('solapamiento mismo día: [480,600] y [540,720] lanza', () => {
    expect(() =>
      validateWorkingHours([
        { dayOfWeek: 1, startMin: 480, endMin: 600 },
        { dayOfWeek: 1, startMin: 540, endMin: 720 },
      ]),
    ).toThrow(InvalidBarberError)
  })

  it('mismo rango exacto mismo día lanza', () => {
    expect(() =>
      validateWorkingHours([
        { dayOfWeek: 2, startMin: 480, endMin: 720 },
        { dayOfWeek: 2, startMin: 480, endMin: 720 },
      ]),
    ).toThrow(InvalidBarberError)
  })

  it('mismo día sin solapamiento no lanza', () => {
    expect(() =>
      validateWorkingHours([
        { dayOfWeek: 1, startMin: 480, endMin: 600 },
        { dayOfWeek: 1, startMin: 660, endMin: 780 },
      ]),
    ).not.toThrow()
  })

  it('mismo horario en días distintos no lanza', () => {
    expect(() =>
      validateWorkingHours([
        { dayOfWeek: 1, startMin: 480, endMin: 720 },
        { dayOfWeek: 2, startMin: 480, endMin: 720 },
      ]),
    ).not.toThrow()
  })

  it('lista vacía no lanza', () => {
    expect(() => validateWorkingHours([])).not.toThrow()
  })

  it('un solo horario válido no lanza', () => {
    expect(() => validateWorkingHours([{ dayOfWeek: 0, startMin: 540, endMin: 720 }]))
      .not.toThrow()
  })
})
