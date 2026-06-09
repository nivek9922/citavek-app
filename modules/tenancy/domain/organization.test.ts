import { describe, it, expect } from 'vitest'
import { canTransitionTo } from './organization'

describe('canTransitionTo', () => {
  it('active → suspended es válido', () => {
    expect(canTransitionTo('active', 'suspended')).toBe(true)
  })

  it('suspended → active es válido', () => {
    expect(canTransitionTo('suspended', 'active')).toBe(true)
  })

  it('active → active no es transición válida', () => {
    expect(canTransitionTo('active', 'active')).toBe(false)
  })

  it('suspended → suspended no es transición válida', () => {
    expect(canTransitionTo('suspended', 'suspended')).toBe(false)
  })
})
