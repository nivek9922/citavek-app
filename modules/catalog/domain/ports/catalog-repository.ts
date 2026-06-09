import type { Service, CreateServiceData, UpdateServiceData } from '../service'

export interface CatalogRepository {
  findById(id: string, organizationId: string): Promise<Service | null>
  create(organizationId: string, data: CreateServiceData): Promise<Service>
  update(id: string, organizationId: string, data: UpdateServiceData): Promise<Service>
  toggle(id: string, organizationId: string, active: boolean): Promise<void>
}
