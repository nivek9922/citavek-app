import { db } from '@/server/db'
import type { CatalogRepository } from '../domain/ports/catalog-repository'

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

  async update(id, _organizationId, data) {
    return db.service.update({ where: { id }, data })
  },

  async toggle(id, _organizationId, active) {
    await db.service.update({ where: { id }, data: { active } })
  },
}
