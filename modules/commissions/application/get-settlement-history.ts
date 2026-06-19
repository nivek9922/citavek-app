import type { CommissionsRepository, SettlementRecord } from '../domain/ports/commissions-repository'

/**
 * Histórico de liquidaciones. Si `barberId`, lo restringe a ese barbero (lo que el
 * propio barbero ve de sus pagos pasados); el `barberId` se resuelve server-side.
 */
export async function getSettlementHistory(
  repo: CommissionsRepository,
  organizationId: string,
  barberId?: string,
): Promise<SettlementRecord[]> {
  return repo.listSettlements(organizationId, barberId)
}
