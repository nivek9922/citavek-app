'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { cloudinaryAdapter } from '@/server/cloudinary'
import { createService }    from './application/create-service'
import { updateService }    from './application/update-service'
import { toggleService }    from './application/toggle-service'
import { setServiceOrder }  from './application/set-service-order'
import { uploadServiceImage } from './application/upload-service-image'
import { prismaCatalogRepository as repo } from './infrastructure/prisma-catalog-repository'

const serviceSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceCop:    z.coerce.number().int().min(0),
  category:    z.enum(['corte', 'barba', 'combo', 'tratamiento', 'infantil']),
  // sortOrder NO se acepta del cliente: lo asigna el repo al crear y solo
  // cambia vía reorderServiceAction. Aceptarlo con default(0) reseteaba el
  // orden en cada edición (causa del bug de las flechas).
  imageUrl:    z.string().url().max(500).optional().or(z.literal('')).transform((v) => v || null),
})

export async function upsertServiceAction(
  slug: string,
  id: string | null,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, id ? 'service:update' : 'service:create')
  try {
    const input = serviceSchema.parse(Object.fromEntries(formData))
    if (id) {
      await updateService(repo, id, ctx.id, input)
    } else {
      await createService(repo, ctx.id, input)
    }
    updateTag(`services:${ctx.id}`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo guardar el servicio.'
    return { ok: false, error: msg }
  }
}

export async function toggleServiceAction(
  slug: string,
  id: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:update')
  try {
    await toggleService(repo, id, ctx.id, active)
    updateTag(`services:${ctx.id}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo cambiar el estado del servicio.' }
  }
}

export async function uploadServiceImageAction(
  slug: string,
  formData: FormData,
  previousUrl?: string | null,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:create')
  try {
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { ok: false, error: 'No se recibió ningún archivo.' }
    if (file.size > 4 * 1024 * 1024) return { ok: false, error: 'La imagen no puede superar los 4 MB.' }
    if (!file.type.startsWith('image/')) return { ok: false, error: 'El archivo debe ser una imagen.' }
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadServiceImage(cloudinaryAdapter, slug, buffer, previousUrl)
    return { ok: true, url }
  } catch {
    return { ok: false, error: 'No se pudo subir la imagen. Intenta de nuevo.' }
  }
}

export async function setServiceOrderAction(
  slug: string,
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:update')
  try {
    await setServiceOrder(repo, ctx.id, orderedIds)
    updateTag(`services:${ctx.id}`)
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo reordenar.' }
  }
}
