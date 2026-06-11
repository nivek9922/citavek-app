'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { createService }   from './application/create-service'
import { updateService }   from './application/update-service'
import { toggleService }   from './application/toggle-service'
import { reorderService }  from './application/reorder-service'
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

export async function upsertServiceAction(slug: string, id: string | null, formData: FormData) {
  const ctx   = await getTenantContext(slug)
  await requirePermission(ctx.id, id ? 'service:update' : 'service:create')
  const input = serviceSchema.parse(Object.fromEntries(formData))

  if (id) {
    await updateService(repo, id, ctx.id, input)
  } else {
    await createService(repo, ctx.id, input)
  }
  updateTag(`services:${ctx.id}`)
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

export async function reorderServiceAction(
  slug: string,
  id: string,
  direction: 'up' | 'down',
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:update')

  const result = await reorderService(repo, ctx.id, id, direction)
  if (!result.ok) return result

  updateTag(`services:${ctx.id}`)
  return { ok: true }
}
