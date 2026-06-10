import { describe, it, expect, vi } from 'vitest'
import { submitReview } from './submit-review'
import { DuplicateReviewError, type Review } from '../domain/review'
import type { ReviewRepository } from '../domain/ports/review-repository'

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id:             'rev-1',
    organizationId: 'org-1',
    barberId:       'barber-1',
    appointmentId:  'apt-1',
    rating:         5,
    comment:        null,
    createdAt:      new Date(),
    ...overrides,
  }
}

function createFakeRepo(existing: Review | null = null) {
  const created: Review[] = []
  const ratingUpdates: string[] = []

  const repo: ReviewRepository = {
    findByAppointment: vi.fn(async () => existing),
    create:            vi.fn(async (data) => {
      const r = makeReview(data)
      created.push(r)
      return r
    }),
    updateBarberRating: vi.fn(async (barberId: string) => {
      ratingUpdates.push(barberId)
    }),
    listByBarber: vi.fn(async () => []),
  }
  return { repo, created, ratingUpdates }
}

const input = {
  organizationId: 'org-1',
  barberId:       'barber-1',
  appointmentId:  'apt-1',
  rating:         4,
  comment:        'Excelente servicio',
}

describe('submitReview', () => {
  it('crea la reseña y actualiza el rating del barbero', async () => {
    const { repo, created, ratingUpdates } = createFakeRepo()

    await submitReview(repo, input)

    expect(created).toHaveLength(1)
    expect(created[0]!.rating).toBe(4)
    expect(ratingUpdates).toContain('barber-1')
  })

  it('lanza DuplicateReviewError si ya existe una reseña para la cita', async () => {
    const { repo } = createFakeRepo(makeReview())

    await expect(submitReview(repo, input)).rejects.toBeInstanceOf(DuplicateReviewError)
  })

  it('no llama create si la cita ya tiene reseña', async () => {
    const { repo } = createFakeRepo(makeReview())

    await expect(submitReview(repo, input)).rejects.toThrow()
    expect(repo.create).not.toHaveBeenCalled()
  })
})
