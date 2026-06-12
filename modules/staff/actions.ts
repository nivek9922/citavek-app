'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { getSession } from '@/server/session'
import { createBarber }        from './application/create-barber'
import { updateBarber }        from './application/update-barber'
import { toggleBarber }        from './application/toggle-barber'
import { uploadBarberAvatar }  from './application/upload-barber-avatar'
import { inviteBarber }        from './application/invite-barber'
import { registerFromInvite }  from './application/register-from-invite'
import { prismaStaffRepository as repo } from './infrastructure/prisma-staff-repository'
import { cloudinaryAdapter } from '@/server/cloudinary'
import { env } from '@/config/env'

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
})

export async function upsertBarberAction(
  slug: string,
  id: string | null,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, id ? 'barber:update' : 'barber:create')
  try {
    const raw = {
      displayName: formData.get('displayName'),
      nickname:    formData.get('nickname') || undefined,
      specialties: formData.get('specialties') || '',
      hoursJson:   formData.get('hoursJson') || '[]',
    }
    const input = barberSchema.parse(raw)

    if (id) {
      await updateBarber(repo, id, ctx.id, {
        displayName: input.displayName,
        nickname:    input.nickname ?? null,
        specialties: input.specialties,
        hours:       input.hoursJson,
      })
    } else {
      await createBarber(repo, ctx.id, {
        displayName: input.displayName,
        nickname:    input.nickname,
        specialties: input.specialties,
        hours:       input.hoursJson,
      })
    }
    updateTag(`barbers:${ctx.id}`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo guardar el barbero.'
    return { ok: false, error: msg }
  }
}

export async function uploadBarberAvatarAction(
  slug:     string,
  barberId: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:update')
  try {
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { ok: false, error: 'No se recibió ningún archivo.' }
    if (file.size > 4 * 1024 * 1024) return { ok: false, error: 'La imagen no puede superar los 4 MB.' }
    if (!file.type.startsWith('image/')) return { ok: false, error: 'El archivo debe ser una imagen.' }
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadBarberAvatar(repo, cloudinaryAdapter, barberId, ctx.id, slug, buffer)
    updateTag(`barbers:${ctx.id}`)
    return { ok: true, url }
  } catch {
    return { ok: false, error: 'No se pudo subir el avatar. Intenta de nuevo.' }
  }
}

export async function toggleBarberAction(slug: string, id: string, active: boolean) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:update')
  await toggleBarber(repo, id, ctx.id, active)
  updateTag(`barbers:${ctx.id}`)
}

export async function generateBarberInviteAction(
  slug: string,
  barberId: string,
): Promise<{ ok: true; inviteUrl: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:update')
  try {
    const { token } = await inviteBarber(repo, barberId, ctx.id)
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    return { ok: true, inviteUrl: `${base}/invite/${token}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo generar la invitación.'
    return { ok: false, error: msg }
  }
}

/**
 * Llamada por el cliente DESPUÉS de que Better Auth creó el usuario con signUp.email().
 * Vincula la cuenta recién creada al barbero de la invitación.
 */
export async function linkBarberInviteAction(
  token: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'No hay sesión activa. Intenta iniciar sesión.' }

  try {
    const { organizationId, orgSlug } = await registerFromInvite(repo, token, session.user.id)

    updateTag(`barbers:${organizationId}`)
    updateTag(`staff:${organizationId}`)

    return { ok: true, slug: orgSlug }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'No se pudo completar el registro.'
    return { ok: false, error: msg }
  }
}
