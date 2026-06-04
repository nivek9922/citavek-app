import { canTransition, type AppointmentStatusValue } from '../domain/appointment'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface ChangeAppointmentStatusInput {
  organizationId: string
  appointmentId:  string
  newStatus:      AppointmentStatusValue
}

/** Use case: cambiar el estado de una cita validando la transición. */
export async function changeAppointmentStatus(
  repo: SchedulingRepository,
  input: ChangeAppointmentStatusInput,
): Promise<void> {
  const current = await repo.getAppointmentStatus(input.organizationId, input.appointmentId)
  if (!current) throw new Error('Cita no encontrada')

  if (!canTransition(current, input.newStatus)) {
    throw new Error(`Transición inválida: ${current} → ${input.newStatus}`)
  }

  const cancelledAt = input.newStatus === 'cancelled' ? new Date() : null
  await repo.updateAppointmentStatus(input.organizationId, input.appointmentId, input.newStatus, cancelledAt)
}
