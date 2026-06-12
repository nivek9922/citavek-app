import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { DeleteResult } from '../domain/ports/tenancy-repository'
import { OrgStatusError, OrgHasAppointmentsError } from '../domain/organization'

export async function deleteOrganization(
  repo: TenancyRepository,
  orgId: string,
): Promise<DeleteResult> {
  const org = await repo.findById(orgId)
  if (!org) throw new OrgStatusError('Organización no encontrada.')
  const count = await repo.countAppointments(orgId)
  if (count > 0) throw new OrgHasAppointmentsError()
  const result = await repo.deleteWithCascade(orgId)
  // Best-effort: si falla, la org ya fue eliminada — no se revierte.
  try {
    await repo.deleteOrphanUsers(result.memberUserIds)
  } catch {
    // ignorado a propósito
  }
  return result
}
