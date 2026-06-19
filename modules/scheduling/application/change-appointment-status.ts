import { canTransition, FutureCompletionError, type AppointmentStatusValue } from '../domain/appointment'
import type { SchedulingRepository } from '../domain/ports/scheduling-repository'

export interface ChangeAppointmentStatusInput {
  organizationId: string
  appointmentId:  string
  newStatus:      AppointmentStatusValue
}

export interface ChangeAppointmentStatusResult {
  customerPhone: string
  customerName:  string
}

/** Use case: cambiar el estado de una cita validando la transición. Devuelve el
 *  snapshot del cliente para que el delivery layer pueda orquestar lealtad. */
export async function changeAppointmentStatus(
  repo: SchedulingRepository,
  input: ChangeAppointmentStatusInput,
): Promise<ChangeAppointmentStatusResult> {
  const apt = await repo.getAppointmentForStatusChange(input.organizationId, input.appointmentId)
  if (!apt) throw new Error('Cita no encontrada')

  if (!canTransition(apt.status, input.newStatus)) {
    throw new Error(`Transición inválida: ${apt.status} → ${input.newStatus}`)
  }

  // Protección de ingresos: no se puede completar una cita que aún no empieza.
  if (input.newStatus === 'completed' && apt.startAt.getTime() > Date.now()) {
    throw new FutureCompletionError()
  }

  const cancelledAt = input.newStatus === 'cancelled' ? new Date() : null
  await repo.updateAppointmentStatus(input.organizationId, input.appointmentId, input.newStatus, cancelledAt)

  return { customerPhone: apt.customerPhone, customerName: apt.customerName }
}
