import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface UnblockBarberDateInput {
  organizationId: string
  barberId:       string | null
  /** YYYY-MM-DD en zona horaria del tenant. */
  dateStr:        string
}

export type UnblockBarberDateResult =
  | { ok: true }
  | { ok: false; error: string }

/** Use case: eliminar el bloqueo de un día en la agenda de un barbero (o de toda la org). */
export async function unblockBarberDate(
  repo: SchedulingRepository,
  input: UnblockBarberDateInput,
): Promise<UnblockBarberDateResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateStr)) {
    return { ok: false, error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' }
  }

  await repo.unblockDate(input.organizationId, input.barberId, input.dateStr)
  return { ok: true }
}
