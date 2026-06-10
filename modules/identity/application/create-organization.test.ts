import { describe, it, expect, vi } from 'vitest'
import { createOrganization, type CreateOrganizationInput } from './create-organization'
import type { IdentityRepository } from '../domain/ports/identity-repository'

// ── Fake repo ────────────────────────────────────────────────────────────────

interface FakeOptions {
  slugTaken?: boolean
}

function createFakeRepo(opts: FakeOptions = {}) {
  const created = {
    org:        null as null | { id: string; slug: string },
    branding:   null as null | { organizationId: string; primaryColor: string },
    membership: null as null | { organizationId: string; userId: string },
  }

  const repo: IdentityRepository = {
    isSlugTaken:        vi.fn(async () => opts.slugTaken ?? false),
    createOrganization: vi.fn(async (data) => {
      const result = { id: 'org-new', slug: data.slug }
      created.org = result
      return result
    }),
    createBranding: vi.fn(async (organizationId, primaryColor) => {
      created.branding = { organizationId, primaryColor }
    }),
    createOwnerMembership: vi.fn(async (organizationId, userId) => {
      created.membership = { organizationId, userId }
    }),
    findAccessCode:   vi.fn(async () => null),
    consumeAccessCode: vi.fn(async () => {}),
    createAccessCode:  vi.fn(async () => ({ id: 'code-1', code: 'BOKR-TEST-TEST', isUsed: false, usedBy: null, usedAt: null, expiresAt: new Date(), createdAt: new Date(), createdBy: 'test' })),
    listAccessCodes:   vi.fn(async () => []),
  }

  return { repo, created }
}

const baseInput: CreateOrganizationInput = {
  userId:       'user-1',
  name:         'San Fernando Barber Club',
  slug:         'san-fernando-cali',
  city:         'Cali',
  phone:        '+573187654321',
  primaryColor: '#E0A300',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createOrganization', () => {
  it('crea org + branding + membership en el happy path', async () => {
    const { repo, created } = createFakeRepo()

    const res = await createOrganization(repo, baseInput)

    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.slug).toBe('san-fernando-cali')
    expect(created.org?.slug).toBe('san-fernando-cali')
    expect(created.branding?.organizationId).toBe('org-new')
    expect(created.membership?.organizationId).toBe('org-new')
    expect(created.membership?.userId).toBe('user-1')
  })

  it('rechaza si el slug ya está en uso', async () => {
    const { repo, created } = createFakeRepo({ slugTaken: true })

    const res = await createOrganization(repo, baseInput)

    expect(res.ok).toBe(false)
    expect((res as { ok: false; error: string }).error).toContain('san-fernando-cali')
    // no debe haber creado nada
    expect(created.org).toBeNull()
    expect(created.branding).toBeNull()
    expect(created.membership).toBeNull()
  })

  it('crea el branding con el color primario indicado', async () => {
    const { repo, created } = createFakeRepo()

    await createOrganization(repo, { ...baseInput, primaryColor: '#F43F5E' })

    expect(created.branding?.primaryColor).toBe('#F43F5E')
  })

  it('usa timezone y currency por defecto cuando no se pasan', async () => {
    const { repo } = createFakeRepo()

    await createOrganization(repo, baseInput)

    expect(repo.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'America/Bogota', currency: 'COP' }),
    )
  })

  it('respeta timezone y currency personalizados si se pasan', async () => {
    const { repo } = createFakeRepo()

    await createOrganization(repo, {
      ...baseInput,
      timezone: 'America/New_York',
      currency: 'USD',
    })

    expect(repo.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'America/New_York', currency: 'USD' }),
    )
  })

  it('vincula la membresía al org recién creado (no a un id hardcoded)', async () => {
    const { repo } = createFakeRepo()
    // simulamos que el adapter devuelve un id diferente
    vi.mocked(repo.createOrganization).mockResolvedValueOnce({ id: 'org-xyz', slug: baseInput.slug })

    await createOrganization(repo, baseInput)

    expect(repo.createBranding).toHaveBeenCalledWith('org-xyz', expect.any(String))
    expect(repo.createOwnerMembership).toHaveBeenCalledWith('org-xyz', 'user-1')
  })

  it('el orden de llamadas es: isSlugTaken → createOrganization → createBranding → createOwnerMembership', async () => {
    const { repo } = createFakeRepo()
    const callOrder: string[] = []

    vi.mocked(repo.isSlugTaken).mockImplementation(async () => { callOrder.push('isSlugTaken'); return false })
    vi.mocked(repo.createOrganization).mockImplementation(async (d) => { callOrder.push('createOrganization'); return { id: 'o', slug: d.slug } })
    vi.mocked(repo.createBranding).mockImplementation(async () => { callOrder.push('createBranding') })
    vi.mocked(repo.createOwnerMembership).mockImplementation(async () => { callOrder.push('createOwnerMembership') })

    await createOrganization(repo, baseInput)

    expect(callOrder).toEqual(['isSlugTaken', 'createOrganization', 'createBranding', 'createOwnerMembership'])
  })
})
