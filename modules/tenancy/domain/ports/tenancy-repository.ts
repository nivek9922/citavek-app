import type { Organization, OrgStatus, BrandingData, OrgInfoData } from '../organization'

export interface DeleteResult {
  slug:          string
  memberUserIds: string[]
}

export interface TenancyRepository {
  findById(id: string): Promise<Organization | null>
  setStatus(id: string, status: OrgStatus): Promise<void>
  updateBranding(organizationId: string, data: BrandingData): Promise<void>
  patchBranding(organizationId: string, patch: Partial<Pick<BrandingData, 'logoUrl' | 'coverUrl'>>): Promise<void>
  updateInfo(id: string, data: OrgInfoData): Promise<void>
  /** Retorna la cantidad de citas históricas de la organización. */
  countAppointments(id: string): Promise<number>
  /** Borra la org (cascade via FK). Devuelve datos necesarios para cleanup post-borrado. */
  deleteWithCascade(id: string): Promise<DeleteResult>
  /** Elimina usuarios que no pertenecen a ninguna otra org ni tienen rol de barbero. */
  deleteOrphanUsers(userIds: string[]): Promise<void>
  /** Guarda (upsert) la nota interna de super-admin sobre un negocio. */
  saveAdminNote(orgId: string, content: string): Promise<void>
}
