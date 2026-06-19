import type { LoyaltyProgramConfig } from '../domain/loyalty'
import type { LoyaltyRepository } from '../domain/ports/loyalty-repository'

export interface RecordCompletedVisitInput {
  organizationId: string
  customerPhone:  string
  customerName:   string
  program:        LoyaltyProgramConfig
}

export async function recordCompletedVisit(
  repo: LoyaltyRepository,
  input: RecordCompletedVisitInput,
): Promise<void> {
  await repo.recordVisit({
    organizationId: input.organizationId,
    customerPhone:  input.customerPhone,
    customerName:   input.customerName,
    requiredVisits: input.program.requiredVisits,
  })
}
