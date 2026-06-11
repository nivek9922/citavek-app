import { describe, it, expect, vi } from 'vitest'
import { updateService } from './update-service'
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
  const updated: UpdateServiceData[] = []
  const repo: CatalogRepository = {
    findById: vi.fn(async () => existing),
    create:   vi.fn(async () => BASE_SERVICE),
    update:   vi.fn(async (_id, _org, data) => { updated.push(data); return { ...BASE_SERVICE, ...data } }),
    toggle:   vi.fn(async () => undefined),
    listIdsInPanelOrder: vi.fn(async () => []),
    setSortOrders:       vi.fn(async () => undefined),
  }
  return { repo, updated }
}

describe('updateService', () => {
  it('happy path: findById → validar → repo.update devuelve servicio actualizado', async () => {
    const { repo } = createFakeRepo()

    const result = await updateService(repo, 'svc-1', 'org-1', { name: 'Corte moderno', priceCop: 25000 })

    expect(repo.findById).toHaveBeenCalledWith('svc-1', 'org-1')
    expect(repo.update).toHaveBeenCalledOnce()
    expect(result.name).toBe('Corte moderno')
  })

  it('servicio no encontrado lanza InvalidServiceError', async () => {
    const { repo } = createFakeRepo(null)

    await expect(updateService(repo, 'svc-x', 'org-1', { name: 'Nuevo' }))
      .rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('actualización parcial: fusiona valores antes de validar', async () => {
    const { repo, updated } = createFakeRepo()

    await updateService(repo, 'svc-1', 'org-1', { priceCop: 30000 })

    expect(repo.update).toHaveBeenCalledOnce()
    expect(updated[0]).toMatchObject({ priceCop: 30000 })
  })

  it('nombre nuevo vacío lanza y no persiste', async () => {
    const { repo } = createFakeRepo()

    await expect(updateService(repo, 'svc-1', 'org-1', { name: '' }))
      .rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('duración nueva inválida lanza y no persiste', async () => {
    const { repo } = createFakeRepo()

    await expect(updateService(repo, 'svc-1', 'org-1', { durationMin: 999 }))
      .rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.update).not.toHaveBeenCalled()
  })
})
