'use server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { env } from '@/config/env'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import { DuplicateReviewError } from './domain/review'
import { submitReview } from './application/submit-review'
import { prismaReviewRepository } from './infrastructure/prisma-review-repository'

export async function generateReviewLinkAction(
  slug: string,
  appointmentId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'appointment:update')

  try {
    const apt = await db.appointment.findUnique({
      where:  { id: appointmentId, organizationId: ctx.id },
      select: { status: true },
    })
    if (!apt) return { ok: false, error: 'Cita no encontrada.' }
    if (apt.status !== 'completed') {
      return { ok: false, error: 'Solo se puede invitar a reseñar citas completadas.' }
    }
    return { ok: true, url: `${env.NEXT_PUBLIC_APP_URL}/r/${appointmentId}` }
  } catch {
    return { ok: false, error: 'No se pudo generar el link.' }
  }
}

export async function submitReviewAction(input: {
  appointmentId: string
  rating:        number
  comment:       string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = clientIpFrom(await headers())
  const allowed = await rateLimit(`review:${ip}`, 5, 60_000)
  if (!allowed) return { ok: false, error: 'Demasiados intentos. Espera un momento.' }

  try {
    const apt = await db.appointment.findUnique({
      where:  { id: input.appointmentId },
      select: { organizationId: true, barberId: true, status: true },
    })
    if (!apt) return { ok: false, error: 'Cita no encontrada.' }
    if (apt.status !== 'completed') {
      return { ok: false, error: 'Solo se pueden reseñar citas completadas.' }
    }

    await submitReview(prismaReviewRepository, {
      organizationId: apt.organizationId,
      barberId:       apt.barberId,
      appointmentId:  input.appointmentId,
      rating:         input.rating,
      comment:        input.comment,
    })

    revalidatePath(`/r/${input.appointmentId}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof DuplicateReviewError) {
      return { ok: false, error: 'Esta cita ya tiene una reseña.' }
    }
    return { ok: false, error: 'No se pudo guardar la reseña.' }
  }
}
