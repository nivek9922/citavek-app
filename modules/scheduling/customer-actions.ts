'use server'
import { z } from 'zod'
import { prismaSchedulingRepository as repo } from './infrastructure/prisma-scheduling-repository'
import { cancelAppointmentByCustomer } from './application/cancel-appointment-by-customer'
import type { CustomerAppointment } from './domain/ports/scheduling-repository'

// ── Portal del cliente (sin autenticación) ───────────────────────────────────
// El teléfono actúa como factor de verificación: si coincide con el de la cita,
// el cliente puede verla y cancelarla.

const phoneSchema = z.string().regex(/^\+\d{7,15}$/, 'Teléfono inválido')

export async function getCustomerAppointmentAction(
  appointmentId: string,
  customerPhone: string,
): Promise<CustomerAppointment | null> {
  try {
    phoneSchema.parse(customerPhone)
    return repo.getAppointmentForCustomer(appointmentId, customerPhone)
  } catch {
    return null
  }
}

export async function cancelByCustomerAction(
  appointmentId: string,
  customerPhone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    phoneSchema.parse(customerPhone)
    return cancelAppointmentByCustomer(repo, { appointmentId, customerPhone })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}
