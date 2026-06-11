import type { Service, CreateServiceData, UpdateServiceData } from '../service'

export interface CatalogRepository {
  findById(id: string, organizationId: string): Promise<Service | null>
  create(organizationId: string, data: CreateServiceData): Promise<Service>
  update(id: string, organizationId: string, data: UpdateServiceData): Promise<Service>
  toggle(id: string, organizationId: string, active: boolean): Promise<void>

  /**
   * IDs de los servicios del tenant en EL MISMO orden que muestra el panel
   * (activos primero, luego sortOrder, luego nombre). El reorden debe operar
   * sobre lo que el usuario ve, no sobre otro criterio de orden.
   */
  listIdsInPanelOrder(organizationId: string): Promise<string[]>

  /** Persiste el orden dado reasignando sortOrder secuencial (0,1,2,…) de forma atómica. */
  setSortOrders(organizationId: string, orderedIds: string[]): Promise<void>
}
