import { DuplicateReviewError } from '../domain/review'
import type { ReviewRepository } from '../domain/ports/review-repository'

export interface SubmitReviewInput {
  organizationId: string
  barberId:       string
  appointmentId:  string
  rating:         number
  comment:        string | null
}

export async function submitReview(
  repo: ReviewRepository,
  input: SubmitReviewInput,
): Promise<void> {
  const existing = await repo.findByAppointment(input.appointmentId)
  if (existing) throw new DuplicateReviewError()
  await repo.create(input)
  await repo.updateBarberRating(input.barberId)
}
