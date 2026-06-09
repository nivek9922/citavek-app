import type { CatalogRepository } from '../domain/ports/catalog-repository'
import { InvalidServiceError } from '../domain/service'

export async function toggleService(
  repo: CatalogRepository,
  id: string,
  organizationId: string,
  active: boolean,
): Promise<void> {
  const existing = await repo.findById(id, organizationId)
  if (!existing) throw new InvalidServiceError('Servicio no encontrado.')
  await repo.toggle(id, organizationId, active)
}
