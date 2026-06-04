import { getTenantContext }        from '@/server/tenant'
import { requirePermission }      from '@/server/auth-guards'
import { listScheduleExceptions } from '@/modules/scheduling/queries'
import { listAllBarbersWithHours } from '@/modules/staff/queries'
import { BlockedDatesManager }    from '@/modules/scheduling/ui/BlockedDatesManager'

export const metadata = { title: 'Días bloqueados' }

export default async function BloqueosPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')

  const [exceptions, barbers] = await Promise.all([
    listScheduleExceptions(ctx.id),
    listAllBarbersWithHours(ctx.id),
  ])

  return (
    <BlockedDatesManager
      tenantSlug={slug}
      exceptions={exceptions}
      barbers={barbers.filter((b) => b.active).map((b) => ({ id: b.id, displayName: b.displayName }))}
    />
  )
}
