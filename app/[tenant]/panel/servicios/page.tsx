import { getTenantContext }   from '@/server/tenant'
import { requirePermission }  from '@/server/auth-guards'
import { db } from '@/server/db'
import { ServicesManager } from '@/modules/catalog/ui/ServicesManager'

export default async function ServiciosPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'service:read')

  const services = await db.service.findMany({
    where:   { organizationId: ctx.id },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, description: true, durationMin: true,
      priceCop: true, category: true, active: true, sortOrder: true, imageUrl: true,
    },
  })

  return <ServicesManager services={services} tenantSlug={slug} />
}
