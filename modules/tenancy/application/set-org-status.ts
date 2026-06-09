import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { OrgStatus } from '../domain/organization'
import { canTransitionTo, OrgStatusError } from '../domain/organization'

export async function setOrgStatus(
  repo: TenancyRepository,
  orgId: string,
  status: OrgStatus,
): Promise<void> {
  const org = await repo.findById(orgId)
  if (!org) throw new OrgStatusError('Organización no encontrada.')
  if (!canTransitionTo(org.status, status)) {
    throw new OrgStatusError(`No se puede cambiar de '${org.status}' a '${status}'.`)
  }
  await repo.setStatus(orgId, status)
}
