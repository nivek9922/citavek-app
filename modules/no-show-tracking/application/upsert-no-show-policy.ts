import type { NoShowRepository } from '../domain/ports/no-show-repository'

export async function upsertNoShowPolicy(
  repo: NoShowRepository,
  input: { organizationId: string; isActive: boolean; strikeThreshold: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.strikeThreshold < 1 || input.strikeThreshold > 10) {
    return { ok: false, error: 'El umbral debe estar entre 1 y 10 strikes.' }
  }
  await repo.upsertPolicy(input.organizationId, {
    isActive: input.isActive,
    strikeThreshold: input.strikeThreshold,
  })
  return { ok: true }
}
