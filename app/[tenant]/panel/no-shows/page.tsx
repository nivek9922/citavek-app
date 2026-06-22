import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { getNoShowPolicy, getNoShowOwnerStats } from '@/modules/no-show-tracking/queries'
import { NoShowPolicyConfig } from '@/modules/no-show-tracking/ui/NoShowPolicyConfig'

export default async function NoShowsPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')

  const [policy, stats] = await Promise.all([
    getNoShowPolicy(ctx.id),
    getNoShowOwnerStats(ctx.id, ctx.timezone),
  ])

  return (
    <NoShowPolicyConfig
      tenantSlug={slug}
      policy={policy}
      stats={stats}
    />
  )
}
