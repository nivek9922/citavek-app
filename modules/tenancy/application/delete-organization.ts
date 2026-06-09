import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { DeleteResult } from '../domain/ports/tenancy-repository'
import { OrgStatusError } from '../domain/organization'

export async function deleteOrganization(
  repo: TenancyRepository,
  orgId: string,
): Promise<DeleteResult> {
  const org = await repo.findById(orgId)
  if (!org) throw new OrgStatusError('Organización no encontrada.')
  return repo.deleteWithCascade(orgId)
}
