export interface BarberInvitation {
  id:             string
  token:          string
  barberId:       string
  organizationId: string
  used:           boolean
  expiresAt:      Date
  createdAt:      Date
}

export interface BarberInvitationWithDetails extends BarberInvitation {
  barber: {
    displayName: string
    organizationId: string
  }
  organization: {
    slug: string
    name: string
  }
}

export class InvitationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvitationError'
  }
}
