import { describe, it, expect, vi } from 'vitest'
import { subDays } from 'date-fns'
import { runSubscriptionLifecycle } from './run-subscription-lifecycle'
import { GRACE_PERIOD_DAYS } from '../domain/subscription'
import type { SubscriptionsRepository, AffectedOrg } from '../domain/ports/subscriptions-repository'

const NOW = new Date('2026-06-16T12:00:00Z')

function fakeRepo(over: Partial<SubscriptionsRepository> = {}): SubscriptionsRepository {
  return {
    findByOrg:           vi.fn(async () => null),
    createTrial:         vi.fn(async () => undefined),
    activate:            vi.fn(async () => undefined),
    extendTrial:         vi.fn(async () => undefined),
    suspend:             vi.fn(async () => undefined),
    cancel:              vi.fn(async () => undefined),
    expireActivePeriods: vi.fn(async () => []),
    expireTrials:        vi.fn(async () => []),
    suspendExpiredGrace: vi.fn(async () => []),
    ...over,
  }
}

describe('runSubscriptionLifecycle', () => {
  it('usa now-5d como corte de gracia y agrega los afectados', async () => {
    const periods: AffectedOrg[] = [{ organizationId: 'o1', slug: 's1' }]
    const trials:  AffectedOrg[] = [{ organizationId: 'o2', slug: 's2' }]
    const grace:   AffectedOrg[] = [{ organizationId: 'o3', slug: 's3' }]
    const repo = fakeRepo({
      expireActivePeriods: vi.fn(async () => periods),
      expireTrials:        vi.fn(async () => trials),
      suspendExpiredGrace: vi.fn(async () => grace),
    })

    const result = await runSubscriptionLifecycle(repo, NOW)

    expect(repo.expireActivePeriods).toHaveBeenCalledWith(NOW)
    expect(repo.expireTrials).toHaveBeenCalledWith(NOW)
    expect(repo.suspendExpiredGrace).toHaveBeenCalledWith(subDays(NOW, GRACE_PERIOD_DAYS))
    expect(result).toEqual({ periodsToGrace: periods, trialsToGrace: trials, graceToSuspended: grace })
  })
})
