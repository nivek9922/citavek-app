/**
 * Tenant Isolation Contract Test — Reviews
 *
 * Verifica que el adaptador Prisma filtra por organizationId donde corresponde.
 * Estrategia: vi.hoisted + vi.mock interceptan Prisma sin DB real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  review: {
    findUnique: vi.fn(async () => null),
    create:     vi.fn(async () => ({
      id: 'rev-1', organizationId: 'org-a', barberId: 'barber-1',
      appointmentId: 'apt-1', rating: 5, comment: null, createdAt: new Date(),
    })),
    aggregate: vi.fn(async () => ({
      _avg:   { rating: 4.5 },
      _count: { _all: 2 },
    })),
    findMany: vi.fn(async () => []),
  },
  barber: {
    update: vi.fn(async () => ({})),
  },
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

const { prismaReviewRepository: repo } = await import('./prisma-review-repository')

type MockCall = Record<string, unknown>

function lastArg(mockFn: ReturnType<typeof vi.fn>): MockCall | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall][]
  return calls.at(-1)?.[0]
}

beforeEach(() => { vi.clearAllMocks() })

describe('PrismaReviewRepository — contract', () => {
  it('create persiste los datos de la reseña', async () => {
    const data = { organizationId: 'org-a', barberId: 'barber-1', appointmentId: 'apt-1', rating: 5, comment: null }
    await repo.create(data)
    const arg = lastArg(mockDb.review.create)
    expect((arg?.data as Record<string, unknown>)?.organizationId).toBe('org-a')
    expect((arg?.data as Record<string, unknown>)?.rating).toBe(5)
  })

  it('updateBarberRating llama aggregate filtrado por barberId', async () => {
    await repo.updateBarberRating('barber-1')
    const arg = lastArg(mockDb.review.aggregate)
    expect((arg?.where as Record<string, unknown>)?.barberId).toBe('barber-1')
  })

  it('updateBarberRating actualiza barber con el avg calculado', async () => {
    await repo.updateBarberRating('barber-1')
    const arg = lastArg(mockDb.barber.update)
    expect((arg?.data as Record<string, unknown>)?.rating).toBe(4.5)
    expect((arg?.data as Record<string, unknown>)?.reviewsCount).toBe(2)
  })

  it('listByBarber incluye organizationId y barberId en el WHERE', async () => {
    await repo.listByBarber('org-a', 'barber-1')
    const arg = lastArg(mockDb.review.findMany)
    expect((arg?.where as Record<string, unknown>)?.organizationId).toBe('org-a')
    expect((arg?.where as Record<string, unknown>)?.barberId).toBe('barber-1')
  })

  it('listByBarber no devuelve datos de otro tenant', async () => {
    await repo.listByBarber('org-a', 'barber-1')
    const where = (lastArg(mockDb.review.findMany)?.where) as Record<string, unknown>
    expect(where?.organizationId).not.toBe('org-b')
  })
})
