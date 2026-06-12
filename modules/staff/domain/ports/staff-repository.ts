import type { Barber, CreateBarberData, UpdateBarberData } from '../barber'
import type { BarberInvitationWithDetails } from '../barber-invitation'

export interface StaffRepository {
  findById(id: string, organizationId: string): Promise<Barber | null>
  create(organizationId: string, data: CreateBarberData): Promise<Barber>
  update(id: string, organizationId: string, data: UpdateBarberData): Promise<Barber>
  toggle(id: string, organizationId: string, active: boolean): Promise<void>

  // Invitation
  createInvitation(barberId: string, organizationId: string, token: string, expiresAt: Date): Promise<{ id: string; token: string }>
  findInvitationByToken(token: string): Promise<BarberInvitationWithDetails | null>
  /** Atómico: vincula userId al barber, marca la invitación usada, crea el member record. */
  completeInvitationRegistration(invitationId: string, barberId: string, organizationId: string, userId: string): Promise<void>
}
