export interface Review {
  id:             string
  organizationId: string
  barberId:       string
  appointmentId:  string
  rating:         number
  comment:        string | null
  createdAt:      Date
}

export class DuplicateReviewError extends Error {
  constructor() {
    super('DUPLICATE_REVIEW')
    this.name = 'DuplicateReviewError'
  }
}
