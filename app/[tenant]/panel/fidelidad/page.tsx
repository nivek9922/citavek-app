import { getTenantContext }  from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { listActiveServices } from '@/modules/catalog/queries'
import { getLoyaltyProgram, getLoyaltyOwnerStats } from '@/modules/loyalty/queries'
import { LoyaltyConfig } from '@/modules/loyalty/ui/LoyaltyConfig'

export default async function FidelidadPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')

  const [program, services, stats] = await Promise.all([
    getLoyaltyProgram(ctx.id),
    listActiveServices(ctx.id),
    getLoyaltyOwnerStats(ctx.id, ctx.timezone),
  ])

  return (
    <LoyaltyConfig
      tenantSlug={slug}
      program={program}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      stats={stats}
    />
  )
}
