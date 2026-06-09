'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { createService }   from './application/create-service'
import { updateService }   from './application/update-service'
import { toggleService }   from './application/toggle-service'
import { prismaCatalogRepository as repo } from './infrastructure/prisma-catalog-repository'

const serviceSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceCop:    z.coerce.number().int().min(0),
  category:    z.enum(['corte', 'barba', 'combo', 'tratamiento', 'infantil']),
  sortOrder:   z.coerce.number().int().default(0),
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
  revalidatePath(`/${slug}/panel/servicios`)
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
    revalidatePath(`/${slug}/panel/servicios`)
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

  const { db } = await import('@/server/db')

  // Fetch all services ordered by (sortOrder, id) — id como tiebreaker
  // para garantizar orden consistente aunque haya sortOrders duplicados (datos legados).
  const services = await db.service.findMany({
    where: { organizationId: ctx.id },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, sortOrder: true },
  })

  const idx = services.findIndex((s) => s.id === id)
  if (idx === -1) return { ok: false, error: 'Servicio no encontrado.' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= services.length) {
    return { ok: false, error: 'Ya está en el límite.' }
  }

  // Swap en el array y reasignar sortOrder secuencial (0,1,2,…).
  // Esto también normaliza datos legados donde todos tienen sortOrder = 0.
  const reordered = [...services]
  ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx]!, reordered[idx]!]

  await db.$transaction(
    reordered.map((s, i) => db.service.update({ where: { id: s.id }, data: { sortOrder: i } })),
  )

  revalidatePath(`/${slug}/panel/servicios`)
  return { ok: true }
}
