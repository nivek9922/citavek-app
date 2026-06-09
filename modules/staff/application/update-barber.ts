import type { StaffRepository } from '../domain/ports/staff-repository'
import type { Barber, UpdateBarberData } from '../domain/barber'
import { validateBarber, validateWorkingHours, InvalidBarberError } from '../domain/barber'

export async function updateBarber(
  repo: StaffRepository,
  id: string,
  organizationId: string,
  data: UpdateBarberData,
): Promise<Barber> {
  const existing = await repo.findById(id, organizationId)
  if (!existing) throw new InvalidBarberError('Barbero no encontrado.')

  if (data.displayName !== undefined) validateBarber({ displayName: data.displayName })
  if (data.hours !== undefined) validateWorkingHours(data.hours)

  return repo.update(id, organizationId, data)
}
