import type { TenancyRepository } from '../domain/ports/tenancy-repository'

export async function saveAdminNote(
  repo:    TenancyRepository,
  orgId:   string,
  content: string,
): Promise<void> {
  await repo.saveAdminNote(orgId, content)
}
