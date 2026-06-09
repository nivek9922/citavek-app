import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { OrgInfoData } from '../domain/organization'

export async function updateOrgInfo(
  repo: TenancyRepository,
  orgId: string,
  data: OrgInfoData,
): Promise<void> {
  await repo.updateInfo(orgId, data)
}
