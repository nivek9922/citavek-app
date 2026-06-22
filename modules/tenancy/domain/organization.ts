// Dominio puro — sin dependencias de framework, Prisma ni React.

export type OrgStatus = 'active' | 'suspended'

export interface Organization {
  id:     string
  slug:   string
  name:   string
  status: OrgStatus
}

export type StorefrontThemeMode = 'DARK' | 'LIGHT' | 'AUTO'

export interface BrandingData {
  primaryColor:    string
  tagline?:        string
  logoUrl?:        string | null
  coverUrl?:       string | null
  storefrontTheme?: StorefrontThemeMode
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

export class OrgHasAppointmentsError extends Error {
  constructor() {
    super('Esta organización tiene citas registradas. Por integridad financiera, suspéndela en lugar de eliminarla.')
    this.name = 'OrgHasAppointmentsError'
  }
}
