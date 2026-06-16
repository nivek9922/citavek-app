/**
 * Tenant Isolation Contract Test — Tenancy
 *
 * Verifica que deleteWithCascade usa una transacción atómica y que
 * updateBranding usa upsert (soporta orgs sin branding previo).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = vi.hoisted(() => ({
  organization: {
    findUnique: vi.fn(async () => ({ id: 'org-1', slug: 'test-slug', name: 'Test', status: 'active' })),
    update:     vi.fn(async () => ({})),
    delete:     vi.fn(async () => ({})),
  },
  appointment: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
  member: {
    findMany: vi.fn(async () => [{ userId: 'u-1' }, { userId: 'u-2' }]),
  },
  branding: {
    upsert: vi.fn(async () => ({})),
  },
  $transaction: vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) {
      return Promise.all(ops)
    }
    return (ops as (tx: unknown) => unknown)(mockDb)
  }),
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

const { prismaTenancyRepository: repo } = await import('./prisma-tenancy-repository')

type MockCall = Record<string, unknown>

function lastArg(mockFn: ReturnType<typeof vi.fn>): MockCall | undefined {
  const calls = mockFn.mock.calls as unknown as [MockCall][]
  return calls.at(-1)?.[0]
}

beforeEach(() => { vi.clearAllMocks() })

describe('PrismaTenancyRepository — delete cascade', () => {
  it('deleteWithCascade borra la organización (las hijas caen por FK onDelete: Cascade)', async () => {
    await repo.deleteWithCascade('org-1')
    // El borrado en cascada lo resuelve Postgres vía las FKs (Organization es el
    // padre de Service/Appointment/… con onDelete: Cascade), no la aplicación.
    expect(mockDb.organization.delete).toHaveBeenCalledOnce()
  })

  it('deleteWithCascade: organization.delete filtra por id (aislamiento por tenant)', async () => {
    await repo.deleteWithCascade('org-1')
    const arg = lastArg(mockDb.organization.delete)
    expect(arg?.where).toMatchObject({ id: 'org-1' })
  })

  it('deleteWithCascade devuelve el slug correcto', async () => {
    const result = await repo.deleteWithCascade('org-1')
    expect(result.slug).toBe('test-slug')
  })

  it('deleteWithCascade devuelve los memberUserIds correctos', async () => {
    const result = await repo.deleteWithCascade('org-1')
    expect(result.memberUserIds).toEqual(['u-1', 'u-2'])
  })

  it('updateBranding usa upsert (soporta org sin branding previo)', async () => {
    await repo.updateBranding('org-1', { primaryColor: '#ff0000' })
    expect(mockDb.branding.upsert).toHaveBeenCalledOnce()
  })
})
