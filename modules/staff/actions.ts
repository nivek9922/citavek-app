'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { createBarber }   from './application/create-barber'
import { updateBarber }   from './application/update-barber'
import { toggleBarber }   from './application/toggle-barber'
import { prismaStaffRepository as repo } from './infrastructure/prisma-staff-repository'

const barberSchema = z.object({
  displayName: z.string().min(2).max(80),
  nickname:    z.string().max(30).optional(),
  specialties: z.string().transform((v) =>
    v.split(',').map((s) => s.trim()).filter(Boolean)),
  hoursJson: z.string().transform((v) =>
    z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startMin:  z.number().int().min(0).max(1439),
      endMin:    z.number().int().min(0).max(1439),
    })).parse(JSON.parse(v))
  ),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')).transform((v) => v || null),
})

export async function upsertBarberAction(slug: string, id: string | null, formData: FormData) {
  const ctx   = await getTenantContext(slug)
  await requirePermission(ctx.id, id ? 'barber:update' : 'barber:create')

  const raw = {
    displayName: formData.get('displayName'),
    nickname:    formData.get('nickname') || undefined,
    specialties: formData.get('specialties') || '',
    hoursJson:   formData.get('hoursJson') || '[]',
    avatarUrl:   formData.get('avatarUrl') || '',
  }
  const input = barberSchema.parse(raw)

  if (id) {
    await updateBarber(repo, id, ctx.id, {
      displayName: input.displayName,
      nickname:    input.nickname ?? null,
      specialties: input.specialties,
      hours:       input.hoursJson,
      avatarUrl:   input.avatarUrl,
    })
  } else {
    await createBarber(repo, ctx.id, {
      displayName: input.displayName,
      nickname:    input.nickname,
      specialties: input.specialties,
      hours:       input.hoursJson,
      avatarUrl:   input.avatarUrl,
    })
  }
  revalidatePath(`/${slug}/panel/equipo`)
}

export async function toggleBarberAction(slug: string, id: string, active: boolean) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:update')
  await toggleBarber(repo, id, ctx.id, active)
  revalidatePath(`/${slug}/panel/equipo`)
}
