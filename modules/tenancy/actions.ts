'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
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
