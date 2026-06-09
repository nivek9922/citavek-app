import { describe, it, expect } from 'vitest'
import { validateService, InvalidServiceError } from './service'

describe('validateService', () => {
  it('nombre vacío lanza InvalidServiceError', () => {
    expect(() => validateService({ name: '', durationMin: 30, priceCop: 10000 }))
      .toThrow(InvalidServiceError)
  })

  it('nombre con solo espacios lanza', () => {
    expect(() => validateService({ name: '   ', durationMin: 30, priceCop: 10000 }))
      .toThrow(InvalidServiceError)
  })

  it('duración < 5 min lanza', () => {
    expect(() => validateService({ name: 'Corte', durationMin: 4, priceCop: 10000 }))
      .toThrow(InvalidServiceError)
  })

  it('duración > 480 min lanza', () => {
    expect(() => validateService({ name: 'Corte', durationMin: 481, priceCop: 10000 }))
      .toThrow(InvalidServiceError)
  })

  it('precio negativo lanza', () => {
    expect(() => validateService({ name: 'Corte', durationMin: 30, priceCop: -1 }))
      .toThrow(InvalidServiceError)
  })

  it('datos válidos no lanza', () => {
    expect(() => validateService({ name: 'Corte', durationMin: 30, priceCop: 20000 }))
      .not.toThrow()
  })

  it('precio = 0 es válido (servicio gratuito)', () => {
    expect(() => validateService({ name: 'Consulta', durationMin: 30, priceCop: 0 }))
      .not.toThrow()
  })

  it('duración = 5 min es válida (límite inferior)', () => {
    expect(() => validateService({ name: 'Corte rápido', durationMin: 5, priceCop: 5000 }))
      .not.toThrow()
  })

  it('duración = 480 min es válida (límite superior)', () => {
    expect(() => validateService({ name: 'Tratamiento completo', durationMin: 480, priceCop: 150000 }))
      .not.toThrow()
  })
})
