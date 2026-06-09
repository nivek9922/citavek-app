import { describe, it, expect, vi } from 'vitest'
import { createService } from './create-service'
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

function createFakeRepo() {
  const created: Parameters<CatalogRepository['create']>[] = []
  const repo: CatalogRepository = {
    findById: vi.fn(async () => BASE_SERVICE),
    create:   vi.fn(async (_orgId, data) => {
      created.push([_orgId, data])
      return { ...BASE_SERVICE, ...data }
    }),
    update: vi.fn(async (_id, _org, data: UpdateServiceData) => ({ ...BASE_SERVICE, ...data })),
    toggle: vi.fn(async () => undefined),
  }
  return { repo, created }
}

describe('createService', () => {
  it('happy path: llama repo.create y devuelve el servicio', async () => {
    const { repo } = createFakeRepo()

    const result = await createService(repo, 'org-1', {
      name: 'Corte clásico', durationMin: 30, priceCop: 20000, category: 'corte', sortOrder: 1,
    })

    expect(repo.create).toHaveBeenCalledOnce()
    expect(result.name).toBe('Corte clásico')
  })

  it('nombre vacío lanza ANTES de llamar repo.create', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createService(repo, 'org-1', { name: '', durationMin: 30, priceCop: 20000, category: 'corte', sortOrder: 1 }),
    ).rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('precio negativo lanza ANTES de llamar repo.create', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createService(repo, 'org-1', { name: 'Corte', durationMin: 30, priceCop: -1, category: 'corte', sortOrder: 1 }),
    ).rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('duración inválida lanza ANTES de llamar repo.create', async () => {
    const { repo } = createFakeRepo()

    await expect(
      createService(repo, 'org-1', { name: 'Corte', durationMin: 2, priceCop: 10000, category: 'corte', sortOrder: 1 }),
    ).rejects.toBeInstanceOf(InvalidServiceError)

    expect(repo.create).not.toHaveBeenCalled()
  })

  it('pasa organizationId y datos correctamente al repo.create', async () => {
    const { repo, created } = createFakeRepo()

    await createService(repo, 'org-99', {
      name: 'Barba', durationMin: 20, priceCop: 15000, category: 'barba', sortOrder: 2,
    })

    expect(created[0]?.[0]).toBe('org-99')
    expect(created[0]?.[1]).toMatchObject({ name: 'Barba', durationMin: 20 })
  })
})
