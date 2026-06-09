import type { StaffRepository }  from '../domain/ports/staff-repository'
import type { ImageStoragePort } from '@/shared/ports/image-storage'
import { InvalidBarberError }    from '../domain/barber'
import { extractCloudinaryPublicId } from '@/server/cloudinary'

export async function uploadBarberAvatar(
  repo:           StaffRepository,
  imageStorage:   ImageStoragePort,
  id:             string,
  organizationId: string,
  orgSlug:        string,
  buffer:         Buffer,
): Promise<string> {
  const existing = await repo.findById(id, organizationId)
  if (!existing) throw new InvalidBarberError('Barbero no encontrado.')

  // Eliminar avatar anterior de Cloudinary (best-effort)
  if (existing.avatarUrl?.includes('res.cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(existing.avatarUrl)
    if (publicId) await imageStorage.delete(publicId).catch(() => {})
  }

  const { secureUrl } = await imageStorage.upload(buffer, `bookingflow/${orgSlug}/barbers`)
  await repo.update(id, organizationId, { avatarUrl: secureUrl })
  return secureUrl
}
