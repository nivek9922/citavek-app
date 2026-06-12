import type { TenancyRepository } from '../domain/ports/tenancy-repository'
import type { ImageStoragePort }  from '@/shared/ports/image-storage'
import { extractCloudinaryPublicId } from '@/server/cloudinary'

export type BrandField = 'logo' | 'cover'

export async function uploadBrandImage(
  repo:           TenancyRepository,
  imageStorage:   ImageStoragePort,
  organizationId: string,
  orgSlug:        string,
  field:          BrandField,
  buffer:         Buffer,
  existingUrl?:   string | null,
): Promise<string> {
  // Eliminar imagen anterior de Cloudinary (best-effort — no falla el upload si esto falla)
  if (existingUrl?.includes('res.cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(existingUrl)
    if (publicId) await imageStorage.delete(publicId).catch(() => {})
  }

  const { secureUrl } = await imageStorage.upload(buffer, `citavek/${orgSlug}/brand`)
  await repo.patchBranding(
    organizationId,
    field === 'logo' ? { logoUrl: secureUrl } : { coverUrl: secureUrl },
  )
  return secureUrl
}
