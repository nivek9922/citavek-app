/**
 * Tenant Isolation Contract Test — Staff
 *
 * Verifica que el adaptador Prisma incluye organizationId donde corresponde
 * y que las operaciones de escritura usan transacciones atómicas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  barber: {
    findFirst: vi.fn(async () => null),
    create:    vi.fn(async () => ({
      id: 'brb-1', organizationId: 'org-a', displayName: 'Carlos',
      nickname: null, specialties: [], active: true, rating: 0, reviewsCount: 0,
    })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    findFirstOrThrow: vi.fn(async () => ({
      id: 'brb-1', organizationId: 'org-a', displayName: 'Carlos',
      nickname: null, specialties: [], active: true, rating: 0, reviewsCount: 0,
    })),
  },
  workingHour: {
    createMany: vi.fn(async () => ({ count: 1 })),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  },
  $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

const { prismaStaffRepository: repo } = await import('./prisma-staff-repository')

type MockCall = Record<string, unknown>

function lastArg(mockFn: ReturnType<typeof vi.fn>): MockCall | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall][]
  return calls.at(-1)?.[0]
}

beforeEach(() => { vi.clearAllMocks() })

describe('PrismaStaffRepository — tenant isolation', () => {
  it('findById incluye organizationId en el WHERE', async () => {
    await repo.findById('brb-1', 'org-a')
    const arg = lastArg(mockDb.barber.findFirst)
    expect(arg?.where).toMatchObject({ organizationId: 'org-a' })
  })

  it('create incluye organizationId en el data del barbero', async () => {
    await repo.create('org-a', { displayName: 'Carlos', specialties: [], hours: [] })
    const arg = lastArg(mockDb.barber.create)
    expect((arg?.data as Record<string, unknown>)?.organizationId).toBe('org-a')
  })

  it('create: working hours se insertan con el barberId del barbero creado', async () => {
    await repo.create('org-a', {
      displayName: 'Carlos',
      specialties: [],
      hours: [{ dayOfWeek: 1, startMin: 480, endMin: 720 }],
    })
    const arg = lastArg(mockDb.workingHour.createMany)
    const data = (arg?.data as Record<string, unknown>[])
    expect(data?.[0]).toMatchObject({ barberId: 'brb-1' })
  })

  it('update: deleteMany + barber.updateMany corren dentro de $transaction', async () => {
    await repo.update('brb-1', 'org-a', {
      displayName: 'Carlos',
      hours: [{ dayOfWeek: 1, startMin: 480, endMin: 720 }],
    })
    expect(mockDb.$transaction).toHaveBeenCalledOnce()
  })

  it('update incluye organizationId en el WHERE', async () => {
    await repo.update('brb-1', 'org-a', { displayName: 'Carlos' })
    const arg = lastArg(mockDb.barber.updateMany)
    expect(arg?.where).toMatchObject({ id: 'brb-1', organizationId: 'org-a' })
  })

  it('update lanza si el barbero no pertenece al tenant (count 0)', async () => {
    mockDb.barber.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(repo.update('brb-ajeno', 'org-a', { displayName: 'X' })).rejects.toThrow()
    expect(mockDb.workingHour.deleteMany).not.toHaveBeenCalled()
  })

  it('toggle incluye organizationId en el WHERE', async () => {
    await repo.toggle('brb-1', 'org-a', false)
    const arg = lastArg(mockDb.barber.updateMany)
    expect(arg?.where).toMatchObject({ id: 'brb-1', organizationId: 'org-a' })
  })

  it('toggle lanza si el barbero no pertenece al tenant (count 0)', async () => {
    mockDb.barber.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(repo.toggle('brb-ajeno', 'org-a', false)).rejects.toThrow()
  })

  it('update: deleteMany filtra por barberId (no borra horarios de otro barbero)', async () => {
    await repo.update('brb-1', 'org-a', {
      hours: [{ dayOfWeek: 1, startMin: 540, endMin: 780 }],
    })
    const arg = lastArg(mockDb.workingHour.deleteMany)
    expect(arg?.where).toMatchObject({ barberId: 'brb-1' })
  })
})
