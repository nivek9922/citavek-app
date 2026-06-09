// Dominio puro — sin dependencias de framework, Prisma ni React.

export type ServiceCategory = 'corte' | 'barba' | 'combo' | 'tratamiento' | 'infantil'

export interface Service {
  id:             string
  name:           string
  description:    string | null
  durationMin:    number
  priceCop:       number
  category:       ServiceCategory
  active:         boolean
  sortOrder:      number
  imageUrl:       string | null
  organizationId: string
}

export interface CreateServiceData {
  name:         string
  description?: string
  durationMin:  number
  priceCop:     number
  category:     ServiceCategory
  sortOrder:    number
}

export type UpdateServiceData = Partial<CreateServiceData>

export class InvalidServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidServiceError'
  }
}

/** Invariantes de negocio del servicio. Función pura, testeable sin DB. */
export function validateService(data: Pick<CreateServiceData, 'name' | 'durationMin' | 'priceCop'>): void {
  if (!data.name?.trim()) throw new InvalidServiceError('El nombre del servicio es requerido.')
  if (data.durationMin < 5 || data.durationMin > 480) {
    throw new InvalidServiceError('La duración debe estar entre 5 y 480 minutos.')
  }
  if (data.priceCop < 0) throw new InvalidServiceError('El precio no puede ser negativo.')
}
