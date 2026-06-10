import type { Review } from '../review'

export interface NewReview {
  organizationId: string
  barberId:       string
  appointmentId:  string
  rating:         number
  comment:        string | null
}

export interface ReviewRepository {
  findByAppointment(appointmentId: string): Promise<Review | null>
  create(data: NewReview): Promise<Review>
  /** Recalcula rating y reviewsCount del barbero desde la DB. */
  updateBarberRating(barberId: string): Promise<void>
  listByBarber(organizationId: string, barberId: string): Promise<Review[]>
}
