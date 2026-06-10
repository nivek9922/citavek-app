// Port del dominio de identidad. No conoce Prisma ni Next.js.

export interface NewOrganizationData {
  name:     string
  slug:     string
  city:     string
  phone:    string
  timezone: string
  currency: string
}

export interface AccessCodeRecord {
  id:        string
  code:      string
  isUsed:    boolean
  usedBy:    string | null
  usedAt:    Date   | null
  expiresAt: Date
  createdAt: Date
  createdBy: string
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

  /** Busca un código de acceso por su valor. Devuelve null si no existe. */
  findAccessCode(code: string): Promise<AccessCodeRecord | null>

  /** Marca el código como usado. */
  consumeAccessCode(code: string, usedBy: string): Promise<void>

  /** Crea un nuevo código de acceso. */
  createAccessCode(code: string, expiresAt: Date, createdBy: string): Promise<AccessCodeRecord>

  /** Lista todos los códigos ordenados por creación desc. */
  listAccessCodes(): Promise<AccessCodeRecord[]>
}
