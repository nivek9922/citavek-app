import type { StaffRepository } from '../domain/ports/staff-repository'
import type { Barber, CreateBarberData } from '../domain/barber'
import { validateBarber, validateWorkingHours } from '../domain/barber'

export async function createBarber(
  repo: StaffRepository,
  organizationId: string,
  data: CreateBarberData,
): Promise<Barber> {
  validateBarber(data)
  validateWorkingHours(data.hours)
  return repo.create(organizationId, data)
}
