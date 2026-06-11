import type { CustomerRepository } from '../domain/ports/customer-repository'

/** Use case: guardar las notas internas de un cliente (vacío → null). */
export async function updateCustomerNotes(
  repo: CustomerRepository,
  customerId: string,
  organizationId: string,
  notes: string,
): Promise<void> {
  const trimmed = notes.trim()
  await repo.updateNotes(customerId, organizationId, trimmed || null)
}
