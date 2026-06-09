/**
 * Tenant Isolation Contract Test — Catalog
 *
 * Verifica que el adaptador Prisma incluye organizationId donde corresponde.
 * Estrategia: vi.hoisted + vi.mock interceptan Prisma sin DB real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  service: {
    findFirst: vi.fn(async () => null),
    create:    vi.fn(async () => ({
      id: 'svc-1', name: 'Corte', description: null, durationMin: 30,
      priceCop: 20000, category: 'corte', active: true, sortOrder: 1,
      imageUrl: null, organizationId: 'org-a',
    })),
    update: vi.fn(async () => ({
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
      name: 'Corte', durationMin: 30, priceCop: 20000, category: 'corte', sortOrder: 1,
    })
    const arg = lastArg(mockDb.service.create)
    expect((arg?.data as Record<string, unknown>)?.organizationId).toBe('org-a')
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
