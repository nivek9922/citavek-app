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

export interface ReviewDTO {
  rating:       number
  comment:      string | null
  createdAt:    Date
  customerName: string
  serviceName:  string
}

export async function listReviewsByBarber(
  organizationId: string,
): Promise<Record<string, ReviewDTO[]>> {
  const reviews = await db.review.findMany({
    where:   { organizationId },
    orderBy: { createdAt: 'desc' },
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
