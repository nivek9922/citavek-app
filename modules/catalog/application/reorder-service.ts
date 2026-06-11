import type { CatalogRepository } from '../domain/ports/catalog-repository'

export type ReorderResult = { ok: true } | { ok: false; error: string }

/**
 * Use case: mover un servicio una posición arriba/abajo en el orden del panel.
 *
 * Reasigna sortOrder secuencial a TODA la lista (no solo al par intercambiado):
 * eso normaliza datos legados con sortOrders duplicados, que era la causa de
 * que las flechas parecieran no hacer nada.
 */
export async function reorderService(
  repo: CatalogRepository,
  organizationId: string,
  id: string,
  direction: 'up' | 'down',
): Promise<ReorderResult> {
  const ids = await repo.listIdsInPanelOrder(organizationId)

  const idx = ids.indexOf(id)
  if (idx === -1) return { ok: false, error: 'Servicio no encontrado.' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= ids.length) {
    return { ok: false, error: 'Ya está en el límite.' }
  }

  const reordered = [...ids]
  ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx]!, reordered[idx]!]

  await repo.setSortOrders(organizationId, reordered)
  return { ok: true }
}
