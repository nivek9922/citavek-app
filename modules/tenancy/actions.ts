'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { requireSuperAdmin, isSuperAdmin } from '@/server/super-admin'
import { db } from '@/server/db'
import log from '@/server/logger'
import { setOrgStatus }      from './application/set-org-status'
import { deleteOrganization } from './application/delete-organization'
import { updateBranding }    from './application/update-branding'
import { updateOrgInfo }     from './application/update-org-info'
import { prismaTenancyRepository as repo } from './infrastructure/prisma-tenancy-repository'

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tagline:      z.string().max(120).optional(),
  logoUrl:      z.string().url().optional().or(z.literal('')),
  coverUrl:     z.string().url().optional().or(z.literal('')),
})

const infoSchema = z.object({
  name:    z.string().min(2).max(80),
  city:    z.string().max(60).optional(),
  address: z.string().max(120).optional(),
  phone:   z.string().max(20).optional(),
})

export async function updateBrandingAction(slug: string, formData: FormData) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')

  const input = brandingSchema.parse({
    primaryColor: formData.get('primaryColor'),
    tagline:      formData.get('tagline') || undefined,
    logoUrl:      formData.get('logoUrl')  || undefined,
    coverUrl:     formData.get('coverUrl') || undefined,
  })

  await updateBranding(repo, ctx.id, input)
  revalidatePath(`/${slug}/panel/marca`)
}

export async function updateOrgInfoAction(slug: string, formData: FormData) {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')

  const input = infoSchema.parse({
    name:    formData.get('name'),
    city:    formData.get('city')    || undefined,
    address: formData.get('address') || undefined,
    phone:   formData.get('phone')   || undefined,
  })

  await updateOrgInfo(repo, ctx.id, input)
  revalidatePath(`/${slug}/panel/marca`)
}

// ── Super-admin: suspender / reactivar suscripción ───────────────────────────

export async function setOrgStatusAction(
  orgId: string,
  status: 'active' | 'suspended',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSuperAdmin()
  try {
    await setOrgStatus(repo, orgId, status)
    log.audit('org.status_changed', { orgId, status, by: session.user.email })
    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    log.error('setOrgStatusAction', { orgId, status, err: String(err) })
    return { ok: false, error: 'No se pudo cambiar el estado.' }
  }
}

// ── Super-admin: eliminar barbería (borrado duro) ────────────────────────────

export async function deleteOrgAction(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSuperAdmin()
  try {
    const { slug, memberUserIds } = await deleteOrganization(repo, orgId)
    log.audit('org.deleted', { orgId, slug, by: session.user.email })

    // Best-effort: limpiar usuarios huérfanos (sin otras membresías ni rol de barbero).
    // Nunca se borra al super-admin. Si esto falla, la barbería ya fue eliminada.
    if (memberUserIds.length > 0) {
      try {
        const orphans = await db.user.findMany({
          where:  { id: { in: memberUserIds }, members: { none: {} }, barbers: { none: {} } },
          select: { id: true, email: true },
        })
        const orphanIds = orphans.filter((u) => !isSuperAdmin(u.email)).map((u) => u.id)
        if (orphanIds.length > 0) {
          await db.user.deleteMany({ where: { id: { in: orphanIds } } })
        }
      } catch {
        // ignorado a propósito
      }
    }

    revalidatePath('/admin')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo eliminar la barbería.' }
  }
}
