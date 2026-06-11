import type { CatalogRepository } from '../domain/ports/catalog-repository'

export async function setServiceOrder(
  repo: CatalogRepository,
  organizationId: string,
  orderedIds: string[],
): Promise<void> {
  await repo.setSortOrders(organizationId, orderedIds)
}
