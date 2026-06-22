import type { NoShowRepository } from '../domain/ports/no-show-repository'

export async function recordStrike(
  repo: NoShowRepository,
  input: {
    organizationId: string
    customerPhone: string
    customerName: string
    appointmentId: string
  },
): Promise<void> {
  const policy = await repo.getPolicy(input.organizationId)
  if (!policy?.isActive) return
  await repo.recordStrike(input)
}
