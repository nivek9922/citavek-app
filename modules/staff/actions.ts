'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { db } from '@/server/db'

const barberSchema = z.object({
  displayName:  z.string().min(2).max(80),
  nickname:     z.string().max(30).optional(),
  specialties:  z.string().transform((v) =>
    v.split(',').map((s) => s.trim()).filter(Boolean)),
  // Horario: días marcados + hora inicio/fin
  workDays:     z.string().transform((v) => v.split(',').map(Number).filter((n) => !isNaN(n))),
  startMin:     z.coerce.number().int().min(0).max(1439),
  endMin:       z.coerce.number().int().min(0).max(1439),
})

export async function upsertBarberAction(slug: string, id: string | null, formData: FormData) {
  const ctx   = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:create')

  const raw = {
    displayName: formData.get('displayName'),
    nickname:    formData.get('nickname') || undefined,
    specialties: formData.get('specialties') || '',
    workDays:    formData.get('workDays') || '',
    startMin:    formData.get('startMin'),
    endMin:      formData.get('endMin'),
  }
  const input = barberSchema.parse(raw)

  if (id) {
    const existing = await db.barber.findFirst({ where: { id, organizationId: ctx.id } })
    if (!existing) throw new Error('Barbero no encontrado')
    await db.barber.update({
      where: { id },
      data: { displayName: input.displayName, nickname: input.nickname ?? null, specialties: input.specialties },
    })
    // Regenerar horarios
    await db.workingHour.deleteMany({ where: { barberId: id } })
    await db.workingHour.createMany({
      data: input.workDays.map((day) => ({
        barberId: id, dayOfWeek: day,
        startMin: input.startMin, endMin: input.endMin,
      })),
    })
  } else {
    const barber = await db.barber.create({
      data: {
        organizationId: ctx.id,
        displayName:    input.displayName,
        nickname:       input.nickname ?? null,
        specialties:    input.specialties,
        active:         true,
      },
    })
    await db.workingHour.createMany({
      data: input.workDays.map((day) => ({
        barberId: barber.id, dayOfWeek: day,
        startMin: input.startMin, endMin: input.endMin,
      })),
    })
  }
  revalidatePath(`/${slug}/panel/equipo`)
}

export async function toggleBarberAction(slug: string, id: string, active: boolean) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:update')
  const existing = await db.barber.findFirst({ where: { id, organizationId: ctx.id } })
  if (!existing) throw new Error('Barbero no encontrado')
  await db.barber.update({ where: { id }, data: { active } })
  revalidatePath(`/${slug}/panel/equipo`)
}
