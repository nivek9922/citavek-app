import { describe, it, expect, vi } from 'vitest'
import { deleteOrganization } from './delete-organization'
import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { Organization, OrgStatus } from '../domain/organization'
import { OrgStatusError } from '../domain/organization'

const BASE_ORG: Organization = { id: 'org-1', slug: 'test-slug', name: 'Test Barbería', status: 'active' }

function createFakeRepo(org: Organization | null = BASE_ORG) {
  const repo: TenancyRepository = {
    findById:          vi.fn(async () => org),
    setStatus:         vi.fn(async (_id: string, _s: OrgStatus) => undefined),
    updateBranding:    vi.fn(async () => undefined),
    patchBranding:     vi.fn(async () => undefined),
    updateInfo:        vi.fn(async () => undefined),
    deleteWithCascade: vi.fn(async () => ({ slug: org?.slug ?? '', memberUserIds: ['u-1', 'u-2'] })),
  }
  return { repo }
}

describe('deleteOrganization', () => {
  it('happy path: llama repo.deleteWithCascade y devuelve {slug, memberUserIds}', async () => {
    const { repo } = createFakeRepo()

    const result = await deleteOrganization(repo, 'org-1')

    expect(repo.deleteWithCascade).toHaveBeenCalledWith('org-1')
    expect(result).toEqual({ slug: 'test-slug', memberUserIds: ['u-1', 'u-2'] })
  })

  it('org no encontrada lanza OrgStatusError, no llama deleteWithCascade', async () => {
    const { repo } = createFakeRepo(null)

    await expect(deleteOrganization(repo, 'org-x')).rejects.toBeInstanceOf(OrgStatusError)

    expect(repo.deleteWithCascade).not.toHaveBeenCalled()
  })

  it('devuelve exactamente lo que repo.deleteWithCascade retorna (slug y memberUserIds correctos)', async () => {
    const org: Organization = { id: 'org-2', slug: 'mi-barberia', name: 'Mi Barbería', status: 'active' }
    const { repo } = createFakeRepo(org)
    ;(repo.deleteWithCascade as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      slug: 'mi-barberia',
      memberUserIds: ['uid-abc', 'uid-def', 'uid-ghi'],
    })

    const result = await deleteOrganization(repo, 'org-2')

    expect(result.slug).toBe('mi-barberia')
    expect(result.memberUserIds).toEqual(['uid-abc', 'uid-def', 'uid-ghi'])
  })
})
