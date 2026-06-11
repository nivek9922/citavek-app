/**
 * Tenant Isolation Contract Test — Catalog
 *
 * Verifica que el adaptador Prisma incluye organizationId donde corresponde.
 * Estrategia: vi.hoisted + vi.mock interceptan Prisma sin DB real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  $transaction: vi.fn(async (ops: unknown[]) => ops),
  service: {
    findFirst:  vi.fn(async () => null),
    findMany:   vi.fn(async () => []),
    aggregate:  vi.fn(async () => ({ _max: { sortOrder: 0 } })),
    create:     vi.fn(async () => ({
      id: 'svc-1', name: 'Corte', description: null, durationMin: 30,
      priceCop: 20000, category: 'corte', active: true, sortOrder: 1,
      imageUrl: null, organizationId: 'org-a',
    })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    findFirstOrThrow: vi.fn(async () => ({
      id: 'svc-1', name: 'Corte', description: null, durationMin: 30,
      priceCop: 20000, category: 'corte', active: true, sortOrder: 1,
      imageUrl: null, organizationId: 'org-a',
    })),
  },
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

const { prismaCatalogRepository: repo } = await import('./prisma-catalog-repository')

type MockCall = Record<string, unknown>

function lastArg(mockFn: ReturnType<typeof vi.fn>): MockCall | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall][]
  return calls.at(-1)?.[0]
}

beforeEach(() => { vi.clearAllMocks() })

describe('PrismaCatalogRepository — tenant isolation', () => {
  it('findById incluye organizationId en el WHERE', async () => {
    await repo.findById('svc-1', 'org-a')
    const arg = lastArg(mockDb.service.findFirst)
    expect(arg?.where).toMatchObject({ organizationId: 'org-a' })
  })

  it('findById no devuelve datos de otro tenant', async () => {
    await repo.findById('svc-1', 'org-a')
    const where = (lastArg(mockDb.service.findFirst)?.where) as Record<string, unknown>
    expect(where?.organizationId).not.toBe('org-b')
  })

  it('create incluye organizationId en el data', async () => {
    await repo.create('org-a', {
      name: 'Corte', durationMin: 30, priceCop: 20000, category: 'corte',
    })
    const arg = lastArg(mockDb.service.create)
    expect((arg?.data as Record<string, unknown>)?.organizationId).toBe('org-a')
  })

  it('update incluye organizationId en el WHERE', async () => {
    await repo.update('svc-1', 'org-a', { name: 'Corte Premium' })
    const arg = lastArg(mockDb.service.updateMany)
    expect(arg?.where).toMatchObject({ id: 'svc-1', organizationId: 'org-a' })
  })

  it('update lanza si el servicio no pertenece al tenant (count 0)', async () => {
    mockDb.service.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(repo.update('svc-ajeno', 'org-a', { name: 'X' })).rejects.toThrow()
    expect(mockDb.service.findFirstOrThrow).not.toHaveBeenCalled()
  })

  it('toggle incluye organizationId en el WHERE', async () => {
    await repo.toggle('svc-1', 'org-a', false)
    const arg = lastArg(mockDb.service.updateMany)
    expect(arg?.where).toMatchObject({ id: 'svc-1', organizationId: 'org-a' })
  })

  it('toggle lanza si el servicio no pertenece al tenant (count 0)', async () => {
    mockDb.service.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(repo.toggle('svc-ajeno', 'org-a', false)).rejects.toThrow()
  })

  it('listIdsInPanelOrder filtra por organizationId', async () => {
    await repo.listIdsInPanelOrder('org-a')
    const arg = lastArg(mockDb.service.findMany)
    expect(arg?.where).toMatchObject({ organizationId: 'org-a' })
  })

  it('setSortOrders incluye organizationId en cada WHERE del batch', async () => {
    await repo.setSortOrders('org-a', ['svc-1', 'svc-2'])
    const calls = mockDb.service.updateMany.mock.calls as unknown as [MockCall][]
    for (const [arg] of calls) {
      expect(arg?.where).toMatchObject({ organizationId: 'org-a' })
    }
    expect(calls).toHaveLength(2)
  })

  it('dos orgs distintas producen wheres distintos en findById', async () => {
    await repo.findById('svc-x', 'org-a')
    const whereA = (lastArg(mockDb.service.findFirst)?.where as Record<string, unknown>)?.organizationId

    await repo.findById('svc-x', 'org-b')
    const whereB = (lastArg(mockDb.service.findFirst)?.where as Record<string, unknown>)?.organizationId

    expect(whereA).toBe('org-a')
    expect(whereB).toBe('org-b')
    expect(whereA).not.toBe(whereB)
  })
})
