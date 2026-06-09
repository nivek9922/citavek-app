import type { CatalogRepository } from '../domain/ports/catalog-repository'
import type { UpdateServiceData, Service } from '../domain/service'
import { validateService, InvalidServiceError } from '../domain/service'

export async function updateService(
  repo: CatalogRepository,
  id: string,
  organizationId: string,
  data: UpdateServiceData,
): Promise<Service> {
  const existing = await repo.findById(id, organizationId)
  if (!existing) throw new InvalidServiceError('Servicio no encontrado.')

  validateService({
    name:        data.name        ?? existing.name,
    durationMin: data.durationMin ?? existing.durationMin,
    priceCop:    data.priceCop    ?? existing.priceCop,
  })

  return repo.update(id, organizationId, data)
}
