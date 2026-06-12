import type { StaffRepository } from '../domain/ports/staff-repository'
import { InvitationError } from '../domain/barber-invitation'

export async function registerFromInvite(
  repo: StaffRepository,
  token: string,
  userId: string,
): Promise<{ barberId: string; organizationId: string; orgSlug: string }> {
  const invitation = await repo.findInvitationByToken(token)
  if (!invitation) throw new InvitationError('Invitación no válida o no encontrada.')
  if (invitation.used) throw new InvitationError('Esta invitación ya fue usada.')
  if (new Date() > invitation.expiresAt) throw new InvitationError('Esta invitación ha expirado.')

  await repo.completeInvitationRegistration(invitation.id, invitation.barberId, invitation.organizationId, userId)

  return {
    barberId:       invitation.barberId,
    organizationId: invitation.organizationId,
    orgSlug:        invitation.organization.slug,
  }
}

/** Solo valida el token sin consumirlo — para la página de registro. */
export async function validateInviteToken(
  repo: StaffRepository,
  token: string,
): Promise<{ barberName: string; orgName: string } | { error: string }> {
  const invitation = await repo.findInvitationByToken(token)
  if (!invitation) return { error: 'Invitación no válida o no encontrada.' }
  if (invitation.used) return { error: 'Esta invitación ya fue usada.' }
  if (new Date() > invitation.expiresAt) return { error: 'Esta invitación ha expirado.' }

  return {
    barberName: invitation.barber.displayName,
    orgName:    invitation.organization.name,
  }
}
