import { describe, it, expect, vi } from 'vitest'
import { reorderService } from './reorder-service'
import type { CatalogRepository } from '../domain/ports/catalog-repository'

function createFakeRepo(ids: string[]) {
  const saved: string[][] = []
  const repo: CatalogRepository = {
    findById: vi.fn(async () => null),
    create:   vi.fn(),
    update:   vi.fn(),
    toggle:   vi.fn(async () => undefined),
    listIdsInPanelOrder: vi.fn(async () => ids),
    setSortOrders:       vi.fn(async (_org, ordered) => { saved.push(ordered) }),
  }
  return { repo, saved }
}

describe('reorderService', () => {
  it('mover abajo intercambia con el siguiente y persiste la lista completa', async () => {
    const { repo, saved } = createFakeRepo(['a', 'b', 'c'])

    const result = await reorderService(repo, 'org-1', 'a', 'down')

    expect(result.ok).toBe(true)
    expect(saved[0]).toEqual(['b', 'a', 'c'])
  })

  it('mover arriba intercambia con el anterior', async () => {
    const { repo, saved } = createFakeRepo(['a', 'b', 'c'])

    const result = await reorderService(repo, 'org-1', 'c', 'up')

    expect(result.ok).toBe(true)
    expect(saved[0]).toEqual(['a', 'c', 'b'])
  })

  it('subir el primero devuelve error sin persistir', async () => {
    const { repo, saved } = createFakeRepo(['a', 'b'])

    const result = await reorderService(repo, 'org-1', 'a', 'up')

    expect(result.ok).toBe(false)
    expect(saved).toHaveLength(0)
  })

  it('bajar el último devuelve error sin persistir', async () => {
    const { repo, saved } = createFakeRepo(['a', 'b'])

    const result = await reorderService(repo, 'org-1', 'b', 'down')

    expect(result.ok).toBe(false)
    expect(saved).toHaveLength(0)
  })

  it('id inexistente devuelve error sin persistir', async () => {
    const { repo, saved } = createFakeRepo(['a', 'b'])

    const result = await reorderService(repo, 'org-1', 'zz', 'down')

    expect(result.ok).toBe(false)
    expect(saved).toHaveLength(0)
  })

  it('pasa el organizationId correcto al repo', async () => {
    const { repo } = createFakeRepo(['a', 'b'])

    await reorderService(repo, 'org-99', 'a', 'down')

    expect(repo.listIdsInPanelOrder).toHaveBeenCalledWith('org-99')
    expect(repo.setSortOrders).toHaveBeenCalledWith('org-99', ['b', 'a'])
  })
})
