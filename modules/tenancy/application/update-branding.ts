import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { BrandingData } from '../domain/organization'

export async function updateBranding(
  repo: TenancyRepository,
  organizationId: string,
  data: BrandingData,
): Promise<void> {
  await repo.updateBranding(organizationId, data)
}
