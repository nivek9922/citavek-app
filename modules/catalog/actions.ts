'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }   from '@/server/tenant'
import { requirePermission }  from '@/server/auth-guards'
import { db } from '@/server/db'

const serviceSchema = z.object({
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceCop:    z.coerce.number().int().min(0),
  category:    z.enum(['corte', 'barba', 'combo', 'tratamiento', 'infantil']),
  sortOrder:   z.coerce.number().int().default(0),
})

export async function upsertServiceAction(slug: string, id: string | null, formData: FormData) {
  const ctx   = await getTenantContext(slug)
  await requirePermission(ctx.id, id ? 'service:update' : 'service:create')
  const input = serviceSchema.parse(Object.fromEntries(formData))

  if (id) {
    const existing = await db.service.findFirst({ where: { id, organizationId: ctx.id } })
    if (!existing) throw new Error('Servicio no encontrado')
    await db.service.update({ where: { id }, data: input })
  } else {
    await db.service.create({ data: { ...input, organizationId: ctx.id } })
  }
  revalidatePath(`/${slug}/panel/servicios`)
}

export async function toggleServiceAction(slug: string, id: string, active: boolean) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:update')
  const existing = await db.service.findFirst({ where: { id, organizationId: ctx.id } })
  if (!existing) throw new Error('Servicio no encontrado')
  await db.service.update({ where: { id }, data: { active } })
  revalidatePath(`/${slug}/panel/servicios`)
}
