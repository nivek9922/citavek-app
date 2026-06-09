// Dominio puro — sin dependencias de framework, Prisma ni React.

export type OrgStatus = 'active' | 'suspended'

export interface Organization {
  id:     string
  slug:   string
  name:   string
  status: OrgStatus
}

export interface BrandingData {
  primaryColor: string
  tagline?:     string
  logoUrl?:     string | null
  coverUrl?:    string | null
}

export interface OrgInfoData {
  name:     string
  city?:    string
  address?: string
  phone?:   string
}

/** Transiciones de estado válidas (ciclo de vida de suscripción). */
const TRANSITIONS: Record<OrgStatus, OrgStatus[]> = {
  active:    ['suspended'],
  suspended: ['active'],
}

export function canTransitionTo(current: OrgStatus, next: OrgStatus): boolean {
  return TRANSITIONS[current].includes(next)
}

export class OrgStatusError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgStatusError'
  }
}
