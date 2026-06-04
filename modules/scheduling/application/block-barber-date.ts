import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface BlockBarberDateInput {
  organizationId: string
  /** null = bloquea toda la organización ese día (festivo global). */
  barberId:       string | null
  /** YYYY-MM-DD en zona horaria del tenant. */
  dateStr:        string
  reason?:        string | null
}

export type BlockBarberDateResult =
  | { ok: true }
  | { ok: false; error: string }

/** Use case: bloquear un día en la agenda de un barbero (o de toda la org). */
export async function blockBarberDate(
  repo: SchedulingRepository,
  input: BlockBarberDateInput,
): Promise<BlockBarberDateResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateStr)) {
    return { ok: false, error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' }
  }

  if (input.barberId !== null) {
    const isActive = await repo.isActiveBarber(input.organizationId, input.barberId)
    if (!isActive) return { ok: false, error: 'El barbero no pertenece a esta organización.' }
  }

  await repo.blockDate(input.organizationId, input.barberId, input.dateStr, input.reason ?? null)
  return { ok: true }
}
