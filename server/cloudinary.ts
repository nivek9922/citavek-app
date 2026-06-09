import { v2 as cloudinary } from 'cloudinary'
import type { ImageStoragePort, UploadResult } from '@/shared/ports/image-storage'

// cloudinary v2 auto-lee CLOUDINARY_URL del entorno (formato: cloudinary://key:secret@cloud_name)

export const cloudinaryAdapter: ImageStoragePort = {
  upload(buffer: Buffer, folder: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, result) => {
          if (err || !result) reject(err ?? new Error('Cloudinary upload fallido'))
          else resolve({ secureUrl: result.secure_url, publicId: result.public_id })
        },
      )
      stream.end(buffer)
    })
  },

  delete(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  },
}

/**
 * Extrae el publicId de una URL de Cloudinary para poder borrarla.
 * Ejemplo: https://res.cloudinary.com/{cloud}/image/upload/v123/bookingflow/slug/brand/abc.jpg
 *          → "bookingflow/slug/brand/abc"
 */
export function extractCloudinaryPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}
