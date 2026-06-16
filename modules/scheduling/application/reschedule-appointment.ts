import { canReschedule } from '../domain/appointment'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface RescheduleAppointmentInput {
  organizationId: string
  appointmentId:  string
  newStartAt:     Date
}

export type RescheduleAppointmentResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Use case: reprogramar una cita existente a un nuevo horario.
 *
 * Reglas:
 * - Solo citas pending/confirmed son reprogramables.
 * - El nuevo horario debe estar en el futuro (margen 5 min).
 * - El barbero debe seguir activo.
 * - No puede haber conflicto con otra cita del barbero en el nuevo slot
 *   (la propia cita se excluye del chequeo para no detectarse como conflicto).
 *
 * La duración total es el snapshot ya guardado en la cita (suma de sus
 * servicios); no se re-deriva del catálogo, así reprogramar es estable aunque
 * el owner edite precios/duración después.
 */
export async function rescheduleAppointment(
  repo: SchedulingRepository,
  input: RescheduleAppointmentInput,
): Promise<RescheduleAppointmentResult> {
  const appointment = await repo.getAppointmentForReschedule(
    input.organizationId,
    input.appointmentId,
  )
  if (!appointment) return { ok: false, error: 'Cita no encontrada.' }

  if (!canReschedule(appointment.status)) {
    return { ok: false, error: `No se puede reprogramar una cita con estado "${appointment.status}".` }
  }

  if (input.newStartAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false, error: 'El nuevo horario seleccionado ya pasó.' }
  }

  if (!(await repo.isActiveBarber(input.organizationId, appointment.barberId))) {
    return { ok: false, error: 'El barbero ya no está disponible.' }
  }

  const newEndAt = new Date(input.newStartAt.getTime() + appointment.durationMin * 60_000)

  const conflict = await repo.hasConflict(
    input.organizationId,
    appointment.barberId,
    input.newStartAt,
    newEndAt,
    input.appointmentId, // excluir la propia cita del chequeo
  )
  if (conflict) return { ok: false, error: 'Ese barbero ya tiene una cita en el nuevo horario.' }

  await repo.updateAppointmentTime(
    input.organizationId,
    input.appointmentId,
    input.newStartAt,
    newEndAt,
  )

  return { ok: true }
}
