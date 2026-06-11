// Port (interface) del dominio. La implementa un Adapter en infrastructure/.

export interface CustomerRepository {
  /** Actualiza las notas internas del cliente. Lanza si no pertenece al tenant. */
  updateNotes(customerId: string, organizationId: string, notes: string | null): Promise<void>
}
