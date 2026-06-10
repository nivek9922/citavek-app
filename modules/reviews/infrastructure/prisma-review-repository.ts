import { db } from '@/server/db'
import type { ReviewRepository } from '../domain/ports/review-repository'

export const prismaReviewRepository: ReviewRepository = {
  async findByAppointment(appointmentId) {
    return db.review.findUnique({ where: { appointmentId } })
  },

  async create(data) {
    return db.review.create({ data })
  },

  async updateBarberRating(barberId) {
    const agg = await db.review.aggregate({
      where:  { barberId },
      _avg:   { rating: true },
      _count: { _all: true },
    })
    await db.barber.update({
      where: { id: barberId },
      data:  {
        rating:       agg._avg.rating ?? 0,
        reviewsCount: agg._count._all,
      },
    })
  },

  async listByBarber(organizationId, barberId) {
    return db.review.findMany({
      where:   { organizationId, barberId },
      orderBy: { createdAt: 'desc' },
    })
  },
}
