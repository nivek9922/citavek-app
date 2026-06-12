import { randomBytes } from 'crypto'
import type { StaffRepository } from '../domain/ports/staff-repository'
import { InvalidBarberError } from '../domain/barber'

const EXPIRY_HOURS = 72

export async function inviteBarber(
  repo: StaffRepository,
  barberId: string,
  organizationId: string,
): Promise<{ token: string }> {
  const barber = await repo.findById(barberId, organizationId)
  if (!barber) throw new InvalidBarberError('Barbero no encontrado.')

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000)

  const inv = await repo.createInvitation(barberId, organizationId, token, expiresAt)
  return { token: inv.token }
}
