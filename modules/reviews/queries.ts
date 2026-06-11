import 'server-only'
import { db } from '@/server/db'

export async function getReviewPageData(appointmentId: string) {
  return db.appointment.findUnique({
    where:  { id: appointmentId },
    select: {
      id:             true,
      status:         true,
      organizationId: true,
      review:  { select: { id: true } },
      service: { select: { name: true } },
      barber:  { select: { id: true, displayName: true, nickname: true, avatarUrl: true } },
    },
  })
}
export type ReviewPageData = NonNullable<Awaited<ReturnType<typeof getReviewPageData>>>

export type TopReviewDTO = {
  id: string
  comment: string
  customerName: string
}

export async function getTopReviews(
  organizationId: string,
  limit = 4,
): Promise<TopReviewDTO[]> {
  const rows = await db.review.findMany({
    where: {
      organizationId,
      rating: 5,
      comment: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      comment: true,
      appointment: { select: { customerName: true } },
    },
  })

  return rows.map(r => ({
    id: r.id,
    comment: r.comment!,
    customerName: maskName(r.appointment.customerName),
  }))
}

function maskName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? full
  const last = parts.at(-1)?.[0]?.toUpperCase() ?? ''
  return `${parts[0]} ${last}.`
}

export interface ReviewDTO {
  rating:       number
  comment:      string | null
  createdAt:    Date
  customerName: string
  serviceName:  string
}

/** Tope de filas: la vista agrupa por barbero y solo muestra las más recientes;
 *  sin límite, un tenant con años de historial cargaría todo en memoria. */
const REVIEWS_FETCH_LIMIT = 200

export async function listReviewsByBarber(
  organizationId: string,
): Promise<Record<string, ReviewDTO[]>> {
  const reviews = await db.review.findMany({
    where:   { organizationId },
    orderBy: { createdAt: 'desc' },
    take:    REVIEWS_FETCH_LIMIT,
    select:  {
      barberId:  true,
      rating:    true,
      comment:   true,
      createdAt: true,
      appointment: {
        select: {
          customerName: true,
          service: { select: { name: true } },
        },
      },
    },
  })

  return reviews.reduce<Record<string, ReviewDTO[]>>((acc, r) => {
    ;(acc[r.barberId] ??= []).push({
      rating:       r.rating,
      comment:      r.comment,
      createdAt:    r.createdAt,
      customerName: r.appointment.customerName,
      serviceName:  r.appointment.service.name,
    })
    return acc
  }, {})
}
