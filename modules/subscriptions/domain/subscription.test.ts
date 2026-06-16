import { describe, it, expect } from 'vitest'
import { addDays, subDays } from 'date-fns'
import {
  canOperate,
  deriveSubscriptionView,
  GRACE_PERIOD_DAYS,
  type SubscriptionSnapshot,
} from './subscription'

const NOW = new Date('2026-06-16T12:00:00Z')

function snap(over: Partial<SubscriptionSnapshot>): SubscriptionSnapshot {
  return {
    status:           'active',
    trialEndsAt:      null,
    currentPeriodEnd: null,
    graceStartedAt:   null,
    ...over,
  }
}

describe('canOperate', () => {
  it('fail-open cuando no hay suscripción', () => {
    expect(canOperate(null, NOW)).toBe(true)
  })

  it('active siempre opera', () => {
    expect(canOperate(snap({ status: 'active' }), NOW)).toBe(true)
  })

  it('trial opera mientras no venza, y bloquea al vencer', () => {
    expect(canOperate(snap({ status: 'trial', trialEndsAt: addDays(NOW, 1) }), NOW)).toBe(true)
    expect(canOperate(snap({ status: 'trial', trialEndsAt: subDays(NOW, 1) }), NOW)).toBe(false)
    expect(canOperate(snap({ status: 'trial', trialEndsAt: null }), NOW)).toBe(true)
  })

  it('grace opera dentro del período y bloquea al agotarse', () => {
    expect(canOperate(snap({ status: 'grace', graceStartedAt: subDays(NOW, 1) }), NOW)).toBe(true)
    expect(canOperate(snap({ status: 'grace', graceStartedAt: subDays(NOW, GRACE_PERIOD_DAYS + 1) }), NOW)).toBe(false)
  })

  it('suspended y cancelled no operan', () => {
    expect(canOperate(snap({ status: 'suspended' }), NOW)).toBe(false)
    expect(canOperate(snap({ status: 'cancelled' }), NOW)).toBe(false)
  })
})

describe('deriveSubscriptionView', () => {
  it('sin suscripción → sin banner', () => {
    expect(deriveSubscriptionView(null, NOW)).toBeNull()
  })

  it('active normal → sin banner', () => {
    expect(deriveSubscriptionView(snap({ status: 'active' }), NOW)).toBeNull()
  })

  it('suspended/cancelled → banner suspended', () => {
    expect(deriveSubscriptionView(snap({ status: 'suspended' }), NOW)).toEqual({ level: 'suspended' })
    expect(deriveSubscriptionView(snap({ status: 'cancelled' }), NOW)).toEqual({ level: 'suspended' })
  })

  it('trial/grace vencidos (aún no marcados por el cron) → banner suspended', () => {
    expect(deriveSubscriptionView(snap({ status: 'trial', trialEndsAt: subDays(NOW, 1) }), NOW))
      .toEqual({ level: 'suspended' })
    expect(deriveSubscriptionView(snap({ status: 'grace', graceStartedAt: subDays(NOW, GRACE_PERIOD_DAYS + 1) }), NOW))
      .toEqual({ level: 'suspended' })
  })

  it('trial lejano → sin banner; trial ≤7 días → trialEnding', () => {
    expect(deriveSubscriptionView(snap({ status: 'trial', trialEndsAt: addDays(NOW, 20) }), NOW)).toBeNull()
    const view = deriveSubscriptionView(snap({ status: 'trial', trialEndsAt: addDays(NOW, 3) }), NOW)
    expect(view).toMatchObject({ level: 'trialEnding', daysLeft: 3 })
  })

  it('grace vigente → banner grace con días restantes', () => {
    const view = deriveSubscriptionView(snap({ status: 'grace', graceStartedAt: subDays(NOW, 2) }), NOW)
    expect(view).toMatchObject({ level: 'grace', daysLeft: GRACE_PERIOD_DAYS - 2 })
  })
})
