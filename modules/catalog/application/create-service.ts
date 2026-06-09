import type { CatalogRepository } from '../domain/ports/catalog-repository'
import type { CreateServiceData, Service } from '../domain/service'
import { validateService } from '../domain/service'

export async function createService(
  repo: CatalogRepository,
  organizationId: string,
  data: CreateServiceData,
): Promise<Service> {
  validateService(data)
  return repo.create(organizationId, data)
}
