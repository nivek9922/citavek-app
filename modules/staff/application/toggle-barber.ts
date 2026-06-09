import type { StaffRepository } from '../domain/ports/staff-repository'
import { InvalidBarberError } from '../domain/barber'

export async function toggleBarber(
  repo: StaffRepository,
  id: string,
  organizationId: string,
  active: boolean,
): Promise<void> {
  const existing = await repo.findById(id, organizationId)
  if (!existing) throw new InvalidBarberError('Barbero no encontrado.')
  await repo.toggle(id, organizationId, active)
}
