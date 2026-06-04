'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { requireSuperAdmin, isSuperAdmin }  from '@/server/super-admin'
import { db } from '@/server/db'

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

  await db.branding.upsert({
    where:  { organizationId: ctx.id },
    update: input,
    create: { organizationId: ctx.id, ...input },
  })

  revalidatePath(`/${slug}`)
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

  await db.organization.update({ where: { id: ctx.id }, data: input })
  revalidatePath(`/${slug}`)
  revalidatePath(`/${slug}/panel/marca`)
}

// ── Super-admin: suspender / reactivar suscripción ───────────────────────────
// Estado del ciclo de vida de la SUSCRIPCIÓN. `suspended` corta el acceso pero
// conserva todos los datos (impago, pausa). Reversible. Hoy manual; en el futuro
// lo disparará el cobro automático.

export async function setOrgStatusAction(
  orgId: string,
  status: 'active' | 'suspended',
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin()
    await db.organization.update({ where: { id: orgId }, data: { status } })
    revalidatePath('/admin')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo cambiar el estado.' }
  }
}

// ── Super-admin: eliminar barbería (borrado duro) ────────────────────────────
// Distinto de suspender: BORRA permanentemente la barbería y todos sus datos.
// Pensado para limpiar barberías de prueba en desarrollo. No reversible.
// Las citas referencian service/barber con onDelete: Restrict, por eso se borran
// primero dentro de la transacción; el resto (barberos, servicios, clientes,
// branding, excepciones, members, invitations) cae por cascada al eliminar la org.

export async function deleteOrgAction(
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin()

    // Capturamos los usuarios miembros ANTES de que el borrado en cascada
    // elimine las filas de `member`.
    const members = await db.member.findMany({
      where:  { organizationId: orgId },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    await db.$transaction([
      db.appointment.deleteMany({ where: { organizationId: orgId } }),
      db.organization.delete({ where: { id: orgId } }),
    ])

    // Limpieza de usuarios que quedaron huérfanos: sin ninguna otra membresía
    // ni rol de barbero en parte alguna. Así un correo de prueba puede volver a
    // registrarse. Nunca se borra al super-admin. Best-effort: si esto falla, la
    // barbería ya se eliminó correctamente y no queremos revertir eso.
    if (memberUserIds.length > 0) {
      try {
        const orphans = await db.user.findMany({
          where: {
            id:      { in: memberUserIds },
            members: { none: {} },
            barbers: { none: {} },
          },
          select: { id: true, email: true },
        })
        const orphanIds = orphans
          .filter((u) => !isSuperAdmin(u.email))
          .map((u) => u.id)
        if (orphanIds.length > 0) {
          await db.user.deleteMany({ where: { id: { in: orphanIds } } })
        }
      } catch {
        // ignorado a propósito: el borrado de la barbería ya fue exitoso
      }
    }

    revalidatePath('/admin')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo eliminar la barbería.' }
  }
}
