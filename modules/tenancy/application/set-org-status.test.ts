import { describe, it, expect, vi } from 'vitest'
import { setOrgStatus } from './set-org-status'
import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { Organization, OrgStatus } from '../domain/organization'
import { OrgStatusError } from '../domain/organization'

const BASE_ORG: Organization = { id: 'org-1', slug: 'test-slug', name: 'Test Barbería', status: 'active' }

function createFakeRepo(org: Organization | null = BASE_ORG) {
  const statusSet: OrgStatus[] = []
  const repo: TenancyRepository = {
    findById:          vi.fn(async () => org),
    setStatus:         vi.fn(async (_id, s) => { statusSet.push(s) }),
    updateBranding:    vi.fn(async () => undefined),
    updateInfo:        vi.fn(async () => undefined),
    deleteWithCascade: vi.fn(async () => ({ slug: org?.slug ?? '', memberUserIds: [] })),
  }
  return { repo, statusSet }
}

describe('setOrgStatus', () => {
  it('active → suspended llama repo.setStatus con suspended', async () => {
    const { repo, statusSet } = createFakeRepo()

    await setOrgStatus(repo, 'org-1', 'suspended')

    expect(repo.setStatus).toHaveBeenCalledWith('org-1', 'suspended')
    expect(statusSet).toEqual(['suspended'])
  })

  it('suspended → active llama repo.setStatus con active', async () => {
    const { repo, statusSet } = createFakeRepo({ ...BASE_ORG, status: 'suspended' })

    await setOrgStatus(repo, 'org-1', 'active')

    expect(statusSet).toEqual(['active'])
  })

  it('active → active lanza OrgStatusError (transición inválida)', async () => {
    const { repo } = createFakeRepo()

    await expect(setOrgStatus(repo, 'org-1', 'active')).rejects.toBeInstanceOf(OrgStatusError)
  })

  it('suspended → suspended lanza OrgStatusError', async () => {
    const { repo } = createFakeRepo({ ...BASE_ORG, status: 'suspended' })

    await expect(setOrgStatus(repo, 'org-1', 'suspended')).rejects.toBeInstanceOf(OrgStatusError)
  })

  it('org no encontrada lanza OrgStatusError', async () => {
    const { repo } = createFakeRepo(null)

    await expect(setOrgStatus(repo, 'org-x', 'suspended')).rejects.toBeInstanceOf(OrgStatusError)
  })

  it('no llama repo.setStatus si la transición es inválida', async () => {
    const { repo } = createFakeRepo()

    await expect(setOrgStatus(repo, 'org-1', 'active')).rejects.toThrow()

    expect(repo.setStatus).not.toHaveBeenCalled()
  })
})
