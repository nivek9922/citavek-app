import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { getOrgSettings }    from '@/modules/tenancy/queries'
import { BrandingSettings }  from '@/modules/tenancy/ui/BrandingSettings'

export default async function MarcaPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'branding:update')

  const { org, branding } = await getOrgSettings(ctx.id)
  return <BrandingSettings tenantSlug={slug} org={org} branding={branding} />
}
