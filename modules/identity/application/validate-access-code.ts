import type { IdentityRepository } from '../domain/ports/identity-repository'

export type ValidateAccessCodeResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Verifica que el código exista, no haya sido usado y no esté vencido.
 * No lo consume — el consumo ocurre DESPUÉS de crear la organización con éxito.
 */
export async function validateAccessCode(
  repo: IdentityRepository,
  code: string,
): Promise<ValidateAccessCodeResult> {
  const record = await repo.findAccessCode(code.trim().toUpperCase())

  if (!record)            return { ok: false, error: 'Código de acceso inválido.' }
  if (record.isUsed)      return { ok: false, error: 'Este código ya fue utilizado.' }
  if (record.expiresAt < new Date()) return { ok: false, error: 'El código de acceso ha vencido.' }

  return { ok: true }
}
