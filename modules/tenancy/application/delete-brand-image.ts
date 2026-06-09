import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { ImageStoragePort }  from '@/shared/ports/image-storage'
import type { BrandField }        from './upload-brand-image'
import { extractCloudinaryPublicId } from '@/server/cloudinary'

export async function deleteBrandImage(
  repo:           TenancyRepository,
  imageStorage:   ImageStoragePort,
  organizationId: string,
  field:          BrandField,
  existingUrl:    string | null,
): Promise<void> {
  if (existingUrl?.includes('res.cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(existingUrl)
    if (publicId) await imageStorage.delete(publicId).catch(() => {})
  }
  await repo.patchBranding(
    organizationId,
    field === 'logo' ? { logoUrl: null } : { coverUrl: null },
  )
}
