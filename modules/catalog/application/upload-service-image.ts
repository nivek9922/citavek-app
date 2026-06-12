import type { ImageStoragePort } from '@/shared/ports/image-storage'
import { extractCloudinaryPublicId } from '@/server/cloudinary'

export async function uploadServiceImage(
  imageStorage: ImageStoragePort,
  orgSlug: string,
  buffer: Buffer,
  previousUrl?: string | null,
): Promise<string> {
  if (previousUrl?.includes('res.cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(previousUrl)
    if (publicId) await imageStorage.delete(publicId).catch(() => {})
  }

  const { secureUrl } = await imageStorage.upload(buffer, `citavek/${orgSlug}/services`)
  return secureUrl
}
