/**
 * Contract test — Subscriptions repository.
 *
 * Mockea @/server/db y verifica que el repo emite las llamadas Prisma correctas:
 * upsert idempotente para trial/activate, update para suspend/cancel/extend, y
 * select-then-updateMany (sin N+1) para el barrido del cron, devolviendo los
 * orgs afectados con su slug.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  subscription: {
    findUnique: vi.fn(async () => null),
    upsert:     vi.fn(async () => ({})),
    update:     vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
    findMany:   vi.fn(async () => [{ organizationId: 'o1', organization: { slug: 's1' } }]),
  },
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

const { prismaSubscriptionsRepository: repo } = await import('./prisma-subscriptions-repository')

type Call = Record<string, unknown>
function lastArg(fn: ReturnType<typeof vi.fn>): Call | undefined {
  return (fn.mock.calls as unknown as [Call][]).at(-1)?.[0]
}

beforeEach(() => { vi.clearAllMocks() })

describe('mutaciones puntuales', () => {
  it('createTrial usa upsert idempotente (update vacío)', async () => {
    const ends = new Date('2026-07-16T00:00:00Z')
    await repo.createTrial('org-1', ends)
    const arg = lastArg(mockDb.subscription.upsert)!
    expect(arg.where).toEqual({ organizationId: 'org-1' })
    expect(arg.create).toMatchObject({ organizationId: 'org-1', status: 'trial', trialEndsAt: ends })
    expect(arg.update).toEqual({})
  })

  it('activate usa upsert y limpia graceStartedAt', async () => {
    const paidAt = new Date('2026-06-16T00:00:00Z')
    const end    = new Date('2026-07-16T00:00:00Z')
    await repo.activate({
      organizationId: 'org-1', amountCop: 79900, paidAt, periodStart: paidAt, periodEnd: end, paymentMethod: 'efectivo',
    })
    const arg = lastArg(mockDb.subscription.upsert)!
    expect(arg.update).toMatchObject({
      status: 'active', currentPeriodEnd: end, lastPaymentAmount: 79900, paymentMethod: 'efectivo', graceStartedAt: null,
    })
  })

  it('suspend y cancel usan update con el estado correcto', async () => {
    await repo.suspend('org-1')
    expect(lastArg(mockDb.subscription.update)!.data).toMatchObject({ status: 'suspended' })

    const at = new Date('2026-06-16T00:00:00Z')
    await repo.cancel('org-1', 'impago', at)
    expect(lastArg(mockDb.subscription.update)!.data).toMatchObject({ status: 'cancelled', cancelledAt: at, cancelReason: 'impago' })
  })
})

describe('barrido del cron (select-then-updateMany)', () => {
  it('expireActivePeriods: active vencido → grace, devuelve afectados con slug', async () => {
    const now = new Date('2026-06-16T12:00:00Z')
    const affected = await repo.expireActivePeriods(now)

    const findArg = lastArg(mockDb.subscription.findMany)!
    expect(findArg.where).toEqual({ status: 'active', currentPeriodEnd: { lte: now } })

    const updArg = lastArg(mockDb.subscription.updateMany)!
    expect(updArg.where).toEqual({ organizationId: { in: ['o1'] }, status: 'active' })
    expect(updArg.data).toEqual({ status: 'grace', graceStartedAt: now })

    expect(affected).toEqual([{ organizationId: 'o1', slug: 's1' }])
  })

  it('expireTrials: trial vencido → grace', async () => {
    const now = new Date('2026-06-16T12:00:00Z')
    await repo.expireTrials(now)
    expect(lastArg(mockDb.subscription.findMany)!.where).toEqual({ status: 'trial', trialEndsAt: { lte: now } })
    expect(lastArg(mockDb.subscription.updateMany)!.data).toEqual({ status: 'grace', graceStartedAt: now })
  })

  it('suspendExpiredGrace: grace agotado → suspended', async () => {
    const cutoff = new Date('2026-06-11T12:00:00Z')
    await repo.suspendExpiredGrace(cutoff)
    expect(lastArg(mockDb.subscription.findMany)!.where).toEqual({ status: 'grace', graceStartedAt: { lte: cutoff } })
    expect(lastArg(mockDb.subscription.updateMany)!.data).toEqual({ status: 'suspended' })
  })

  it('sin afectados → no llama updateMany y devuelve []', async () => {
    mockDb.subscription.findMany.mockResolvedValueOnce([])
    const affected = await repo.expireActivePeriods(new Date())
    expect(affected).toEqual([])
    expect(mockDb.subscription.updateMany).not.toHaveBeenCalled()
  })
})
