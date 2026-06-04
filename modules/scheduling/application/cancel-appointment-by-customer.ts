import { canTransition } from '../domain/appointment'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

/** Minutos mínimos de antelación para que un cliente pueda cancelar. */
const MIN_CANCEL_ADVANCE_MIN = 60

export interface CancelByCustomerInput {
  appointmentId: string
  customerPhone: string
}

export type CancelByCustomerResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Use case: el cliente cancela su propia cita sin necesitar cuenta.
 *
 * Reglas:
 * - El teléfono debe coincidir con el de la cita (verificación de identidad).
 * - Solo se pueden cancelar citas pending o confirmed.
 * - La cita debe estar al menos 60 minutos en el futuro.
 */
export async function cancelAppointmentByCustomer(
  repo: SchedulingRepository,
  input: CancelByCustomerInput,
): Promise<CancelByCustomerResult> {
  const appointment = await repo.getAppointmentForCustomer(
    input.appointmentId,
    input.customerPhone,
  )

  if (!appointment) {
    return { ok: false, error: 'Cita no encontrada. Verifica tu número de teléfono.' }
  }

  if (!canTransition(appointment.status, 'cancelled')) {
    const label = appointment.status === 'completed'
      ? 'ya completada'
      : appointment.status === 'cancelled'
        ? 'ya cancelada'
        : 'en un estado que no permite cancelación'
    return { ok: false, error: `Esta cita está ${label}.` }
  }

  const minutesUntil = (appointment.startAt.getTime() - Date.now()) / 60_000
  if (minutesUntil < MIN_CANCEL_ADVANCE_MIN) {
    return {
      ok: false,
      error: `Solo puedes cancelar con al menos ${MIN_CANCEL_ADVANCE_MIN} minutos de anticipación. Llama directamente a la barbería.`,
    }
  }

  await repo.updateAppointmentStatus(
    appointment.organizationId,
    input.appointmentId,
    'cancelled',
    new Date(),
  )

  return { ok: true }
}
