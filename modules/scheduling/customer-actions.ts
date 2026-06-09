'use server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import { prismaSchedulingRepository as repo } from './infrastructure/prisma-scheduling-repository'
import { cancelAppointmentByCustomer } from './application/cancel-appointment-by-customer'
import type { CustomerAppointment } from './domain/ports/scheduling-repository'

// ── Portal del cliente (sin autenticación) ───────────────────────────────────
// El teléfono actúa como factor de verificación: si coincide con el de la cita,
// el cliente puede verla y cancelarla. Sin sesión → límite por IP contra abuso /
// enumeración (probar teléfonos contra un appointmentId conocido).

const phoneSchema = z.string().regex(/^\+\d{7,15}$/, 'Teléfono inválido')

export async function getCustomerAppointmentAction(
  appointmentId: string,
  customerPhone: string,
): Promise<CustomerAppointment | null> {
  try {
    const ip = clientIpFrom(await headers())
    if (!await rateLimit(`cita-lookup:${ip}`, 20, 60_000)) return null

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
    const ip = clientIpFrom(await headers())
    if (!await rateLimit(`cita-cancel:${ip}`, 10, 60_000)) {
      return { ok: false, error: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.' }
    }

    phoneSchema.parse(customerPhone)
    return cancelAppointmentByCustomer(repo, { appointmentId, customerPhone })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}
