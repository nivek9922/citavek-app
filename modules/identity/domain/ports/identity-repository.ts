// Port del dominio de identidad. No conoce Prisma ni Next.js.

export interface NewOrganizationData {
  name:     string
  slug:     string
  city:     string
  phone:    string
  timezone: string
  currency: string
}

export interface IdentityRepository {
  /** ¿El slug ya está en uso por alguna organización? */
  isSlugTaken(slug: string): Promise<boolean>

  /** Crea la organización raíz. Devuelve el id y el slug asignados. */
  createOrganization(data: NewOrganizationData): Promise<{ id: string; slug: string }>

  /** Crea el branding inicial de la organización. */
  createBranding(organizationId: string, primaryColor: string): Promise<void>

  /** Vincula a un usuario como miembro owner de la organización. */
  createOwnerMembership(organizationId: string, userId: string): Promise<void>
}
