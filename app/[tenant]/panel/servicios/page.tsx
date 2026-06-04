import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { listAllServices }   from '@/modules/catalog/queries'
import { ServicesManager }   from '@/modules/catalog/ui/ServicesManager'

export default async function ServiciosPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:read')

  const services = await listAllServices(ctx.id)
  return <ServicesManager services={services} tenantSlug={slug} />
}
