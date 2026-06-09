import type { Barber, CreateBarberData, UpdateBarberData } from '../barber'

export interface StaffRepository {
  findById(id: string, organizationId: string): Promise<Barber | null>
  create(organizationId: string, data: CreateBarberData): Promise<Barber>
  update(id: string, organizationId: string, data: UpdateBarberData): Promise<Barber>
  toggle(id: string, organizationId: string, active: boolean): Promise<void>
}
