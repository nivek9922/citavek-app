import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { db } from '@/server/db'
import { BrandingSettings } from '@/modules/tenancy/ui/BrandingSettings'

export default async function MarcaPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')

  const [org, branding] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: ctx.id },
      select: { name: true, city: true, address: true, phone: true },
    }),
    db.branding.findUnique({ where: { organizationId: ctx.id } }),
  ])

  return (
    <BrandingSettings
      tenantSlug={slug}
      org={org}
      branding={branding}
    />
  )
}
