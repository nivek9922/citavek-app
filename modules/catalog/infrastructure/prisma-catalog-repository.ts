import { db } from '@/server/db'
import type { CatalogRepository } from '../domain/ports/catalog-repository'
import { InvalidServiceError } from '../domain/service'

export const prismaCatalogRepository: CatalogRepository = {
  async findById(id, organizationId) {
    return db.service.findFirst({ where: { id, organizationId } })
  },

  async create(organizationId, data) {
    const { _max } = await db.service.aggregate({
      where: { organizationId },
      _max:  { sortOrder: true },
    })
    const sortOrder = (_max.sortOrder ?? -1) + 1
    return db.service.create({ data: { ...data, organizationId, sortOrder } })
  },

  async update(id, organizationId, data) {
    // updateMany permite WHERE compuesto: el tenant scoping va en la propia
    // query, no solo en checks previos del use case (defensa en profundidad).
    const { count } = await db.service.updateMany({
      where: { id, organizationId },
      data,
    })
    if (count === 0) throw new InvalidServiceError('Servicio no encontrado.')
    return db.service.findFirstOrThrow({ where: { id, organizationId } })
  },

  async toggle(id, organizationId, active) {
    const { count } = await db.service.updateMany({
      where: { id, organizationId },
      data:  { active },
    })
    if (count === 0) throw new InvalidServiceError('Servicio no encontrado.')
  },

  async listIdsInPanelOrder(organizationId) {
    // Mismo orderBy que listAllServices (queries.ts): el reorden debe operar
    // sobre el orden que el usuario tiene delante.
    const services = await db.service.findMany({
      where:   { organizationId },
      orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select:  { id: true },
    })
    return services.map((s) => s.id)
  },

  async setSortOrders(organizationId, orderedIds) {
    await db.$transaction(
      orderedIds.map((id, i) =>
        db.service.updateMany({ where: { id, organizationId }, data: { sortOrder: i } }),
      ),
    )
  },
}
