import { describe, it, expect, vi } from 'vitest'
import { addDays, subDays } from 'date-fns'
import { extendTrial } from './extend-trial'
import { SubscriptionError } from './activate-subscription'
import type { SubscriptionsRepository, SubscriptionRecord } from '../domain/ports/subscriptions-repository'

const NOW = new Date('2026-06-16T12:00:00Z')

function record(over: Partial<SubscriptionRecord>): SubscriptionRecord {
  return {
    organizationId: 'o1', plan: 'basic', status: 'trial',
    trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, graceStartedAt: null,
    lastPaymentAt: null, lastPaymentAmount: null, paymentMethod: null,
    cancelledAt: null, cancelReason: null,
    ...over,
  }
}

function fakeRepo(rec: SubscriptionRecord | null): SubscriptionsRepository & { extendTrial: ReturnType<typeof vi.fn> } {
  return {
    findByOrg:           vi.fn(async () => rec),
    createTrial:         vi.fn(async () => undefined),
    activate:            vi.fn(async () => undefined),
    extendTrial:         vi.fn(async () => undefined),
    suspend:             vi.fn(async () => undefined),
    cancel:              vi.fn(async () => undefined),
    expireActivePeriods: vi.fn(async () => []),
    expireTrials:        vi.fn(async () => []),
    suspendExpiredGrace: vi.fn(async () => []),
  } as never
}

describe('extendTrial', () => {
  it('extiende desde el vencimiento actual si aún es futuro', async () => {
    const future = addDays(NOW, 5)
    const repo = fakeRepo(record({ trialEndsAt: future }))
    await extendTrial(repo, { organizationId: 'o1', days: 10, now: NOW })
    expect(repo.extendTrial).toHaveBeenCalledWith('o1', addDays(future, 10))
  })

  it('extiende desde hoy si el trial ya venció', async () => {
    const repo = fakeRepo(record({ trialEndsAt: subDays(NOW, 3) }))
    await extendTrial(repo, { organizationId: 'o1', days: 7, now: NOW })
    expect(repo.extendTrial).toHaveBeenCalledWith('o1', addDays(NOW, 7))
  })

  it('rechaza días no positivos y org sin suscripción', async () => {
    await expect(extendTrial(fakeRepo(record({})), { organizationId: 'o1', days: 0, now: NOW }))
      .rejects.toBeInstanceOf(SubscriptionError)
    await expect(extendTrial(fakeRepo(null), { organizationId: 'o1', days: 5, now: NOW }))
      .rejects.toBeInstanceOf(SubscriptionError)
  })
})
