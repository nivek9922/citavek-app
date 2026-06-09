// Dominio puro — sin dependencias de framework, Prisma ni React.

export type AppointmentStatusValue =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentSourceValue = 'online' | 'manual'

/** Transiciones de estado permitidas (regla de negocio). */
const TRANSITIONS: Record<AppointmentStatusValue, AppointmentStatusValue[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
}

export function canTransition(
  from: AppointmentStatusValue,
  to: AppointmentStatusValue,
): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Solo se pueden reprogramar citas activas (no cerradas ni canceladas). */
export function canReschedule(status: AppointmentStatusValue): boolean {
  return status === 'pending' || status === 'confirmed'
}

/**
 * El slot quedó ocupado entre la validación y la escritura (condición de carrera).
 * Lo lanza el adapter cuando la re-verificación dentro de la transacción detecta
 * un solape; las Server Actions lo traducen a un mensaje amable para el usuario.
 */
export class SlotConflictError extends Error {
  constructor() {
    super('SLOT_CONFLICT')
    this.name = 'SlotConflictError'
  }
}
