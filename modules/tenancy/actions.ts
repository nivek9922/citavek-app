'use server'
import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { requireSuperAdmin, isSuperAdmin } from '@/server/super-admin'
import { db } from '@/server/db'
import log from '@/server/logger'
import { setOrgStatus }       from './application/set-org-status'
import { deleteOrganization } from './application/delete-organization'
import { OrgHasAppointmentsError } from './domain/organization'
import { updateBranding }     from './application/update-branding'
import { updateOrgInfo }      from './application/update-org-info'
import { uploadBrandImage }   from './application/upload-brand-image'
import { deleteBrandImage }   from './application/delete-brand-image'
import { prismaTenancyRepository as repo } from './infrastructure/prisma-tenancy-repository'
import { cloudinaryAdapter } from '@/server/cloudinary'

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tagline:      z.string().max(120).optional(),
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
  })

  await updateBranding(repo, ctx.id, input)
  updateTag(`tenant:${slug}`)
  // El color de marca alimenta el theme_color del manifiesto y el avatar fallback.
  revalidatePath(`/${slug}/manifest.webmanifest`)
  revalidatePath(`/${slug}/icon`)
}

async function extractImageBuffer(formData: FormData): Promise<Buffer | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No se recibió ningún archivo.' }
  if (file.size > 4 * 1024 * 1024) return { error: 'La imagen no puede superar los 4 MB.' }
  if (!file.type.startsWith('image/')) return { error: 'El archivo debe ser una imagen.' }
  return Buffer.from(await file.arrayBuffer())
}

export async function uploadTenantLogoAction(
  slug: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')
  try {
    const result = await extractImageBuffer(formData)
    if (!Buffer.isBuffer(result)) return { ok: false, error: result.error }
    const url = await uploadBrandImage(repo, cloudinaryAdapter, ctx.id, slug, 'logo', result, ctx.branding.logoUrl)
    updateTag(`tenant:${slug}`)
    // El logo es el icono del manifiesto; si antes no había, deja de usarse el avatar fallback.
    revalidatePath(`/${slug}/manifest.webmanifest`)
    revalidatePath(`/${slug}/icon`)
    return { ok: true, url }
  } catch {
    return { ok: false, error: 'No se pudo subir el logo. Intenta de nuevo.' }
  }
}

export async function uploadTenantCoverAction(
  slug: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')
  try {
    const result = await extractImageBuffer(formData)
    if (!Buffer.isBuffer(result)) return { ok: false, error: result.error }
    const url = await uploadBrandImage(repo, cloudinaryAdapter, ctx.id, slug, 'cover', result, ctx.branding.coverUrl)
    updateTag(`tenant:${slug}`)
    return { ok: true, url }
  } catch {
    return { ok: false, error: 'No se pudo subir la imagen de portada. Intenta de nuevo.' }
  }
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
  updateTag(`tenant:${slug}`)
  // El nombre alimenta name/short_name del manifiesto y la inicial del avatar fallback.
  revalidatePath(`/${slug}/manifest.webmanifest`)
  revalidatePath(`/${slug}/icon`)
}

export async function deleteTenantBrandAssetAction(
  slug:  string,
  field: 'logo' | 'cover',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')
  try {
    const existingUrl = field === 'logo' ? ctx.branding.logoUrl : ctx.branding.coverUrl
    await deleteBrandImage(repo, cloudinaryAdapter, ctx.id, field, existingUrl)
    updateTag(`tenant:${slug}`)
    // Solo el logo es icono del manifiesto; al quitarlo se vuelve al avatar fallback.
    if (field === 'logo') {
      revalidatePath(`/${slug}/manifest.webmanifest`)
      revalidatePath(`/${slug}/icon`)
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo eliminar la imagen. Intenta de nuevo.' }
  }
}

// ── Super-admin: detalles del negocio (para el Sheet Mini-CRM) ───────────────

export interface OrgDetails {
  phone:        string | null
  ownerName:    string | null
  ownerEmail:   string | null
  onlineCount:  number
  manualCount:  number
  adminNote:    string | null
}

export async function getOrgDetailsAction(
  orgId: string,
): Promise<{ ok: true; data: OrgDetails } | { ok: false; error: string }> {
  await requireSuperAdmin()
  try {
    const [org, owner, sourceCounts, adminNote] = await Promise.all([
      db.organization.findUnique({ where: { id: orgId }, select: { phone: true } }),
      db.member.findFirst({
        where:  { organizationId: orgId, role: 'owner' },
        select: { user: { select: { email: true, name: true } } },
      }),
      db.appointment.groupBy({
        by:     ['source'],
        where:  { organizationId: orgId },
        _count: { _all: true },
      }),
      db.adminNote.findUnique({
        where:  { organizationId: orgId },
        select: { content: true },
      }),
    ])

    const onlineCount = sourceCounts.find((s) => s.source === 'online')?._count._all ?? 0
    const manualCount = sourceCounts.find((s) => s.source === 'manual')?._count._all ?? 0

    return {
      ok:   true,
      data: {
        phone:       org?.phone ?? null,
        ownerName:   owner?.user.name ?? null,
        ownerEmail:  owner?.user.email ?? null,
        onlineCount,
        manualCount,
        adminNote:   adminNote?.content ?? null,
      },
    }
  } catch (err) {
    log.error('getOrgDetailsAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudieron cargar los detalles.' }
  }
}

// ── Super-admin: guardar nota interna sobre un negocio ────────────────────────

export async function saveAdminNoteAction(
  orgId:   string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSuperAdmin()
  try {
    await db.adminNote.upsert({
      where:  { organizationId: orgId },
      create: { organizationId: orgId, content },
      update: { content },
    })
    log.audit('org.admin_note_saved', { orgId, by: session.user.email, charCount: content.length })
    return { ok: true }
  } catch (err) {
    log.error('saveAdminNoteAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudo guardar la nota.' }
  }
}

// ── Super-admin: suspender / reactivar suscripción ───────────────────────────

export async function setOrgStatusAction(
  orgId: string,
  status: 'active' | 'suspended',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSuperAdmin()
  try {
    // Obtener slug ANTES de la mutación para poder invalidar el tag del tenant público.
    const orgRow = await db.organization.findUnique({ where: { id: orgId }, select: { slug: true } })
    await setOrgStatus(repo, orgId, status)
    log.audit('org.status_changed', { orgId, status, by: session.user.email })
    if (orgRow) updateTag(`tenant:${orgRow.slug}`)
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

    updateTag(`tenant:${slug}`)
    revalidatePath('/admin')
    return { ok: true }
  } catch (err) {
    if (err instanceof OrgHasAppointmentsError) {
      return { ok: false, error: err.message }
    }
    return { ok: false, error: 'No se pudo eliminar la barbería.' }
  }
}
