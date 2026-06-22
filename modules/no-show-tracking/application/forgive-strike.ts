import type { NoShowRepository } from '../domain/ports/no-show-repository'

export async function forgiveStrike(
  repo: NoShowRepository,
  organizationId: string,
  strikeId: string,
  note: string | null,
): Promise<void> {
  await repo.forgiveStrike(organizationId, strikeId, note)
}
