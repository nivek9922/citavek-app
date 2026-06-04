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
 * - El servicio y el barbero deben seguir activos.
 * - No puede haber conflicto con otra cita del barbero en el nuevo slot
 *   (la propia cita se excluye del chequeo para no detectarse como conflicto).
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

  const [service, isBarberActive] = await Promise.all([
    repo.getBookableService(input.organizationId, appointment.serviceId),
    repo.isActiveBarber(input.organizationId, appointment.barberId),
  ])

  if (!service)        return { ok: false, error: 'El servicio asociado ya no está disponible.' }
  if (!isBarberActive) return { ok: false, error: 'El barbero ya no está disponible.' }

  const newEndAt = new Date(input.newStartAt.getTime() + service.durationMin * 60_000)

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
