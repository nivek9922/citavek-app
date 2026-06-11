import { describe, it, expect, vi } from 'vitest'
import { toggleService } from './toggle-service'
import type { CatalogRepository } from '../domain/ports/catalog-repository'
import type { Service, UpdateServiceData } from '../domain/service'
import { InvalidServiceError } from '../domain/service'

const BASE_SERVICE: Service = {
  id:             'svc-1',
  name:           'Corte clásico',
  description:    null,
  durationMin:    30,
  priceCop:       20000,
  category:       'corte',
  active:         true,
  sortOrder:      1,
  imageUrl:       null,
  organizationId: 'org-1',
}

function createFakeRepo(existing: Service | null = BASE_SERVICE) {
  const toggled: boolean[] = []
  const repo: CatalogRepository = {
    findById: vi.fn(async () => existing),
    create:   vi.fn(async () => BASE_SERVICE),
    update:   vi.fn(async (_id, _org, data: UpdateServiceData) => ({ ...BASE_SERVICE, ...data })),
    toggle:   vi.fn(async (_id, _org, active) => { toggled.push(active) }),
    listIdsInPanelOrder: vi.fn(async () => []),
    setSortOrders:       vi.fn(async () => undefined),
  }
  return { repo, toggled }
}

describe('toggleService', () => {
  it('toggle a inactivo llama repo.toggle con active=false', async () => {
    const { repo, toggled } = createFakeRepo()

    await toggleService(repo, 'svc-1', 'org-1', false)

    expect(repo.toggle).toHaveBeenCalledWith('svc-1', 'org-1', false)
    expect(toggled).toEqual([false])
  })

  it('toggle a activo llama repo.toggle con active=true', async () => {
    const { repo, toggled } = createFakeRepo({ ...BASE_SERVICE, active: false })

    await toggleService(repo, 'svc-1', 'org-1', true)

    expect(toggled).toEqual([true])
  })

  it('servicio no encontrado lanza y no llama repo.toggle', async () => {
    const { repo } = createFakeRepo(null)

    await expect(toggleService(repo, 'svc-x', 'org-1', false))
      .rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.toggle).not.toHaveBeenCalled()
  })
})
