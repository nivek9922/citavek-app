import { getTenantContext }         from '@/server/tenant'
import { requirePermission }       from '@/server/auth-guards'
import { listAllBarbersWithHours } from '@/modules/staff/queries'
import { listReviewsByBarber }     from '@/modules/reviews/queries'
import { BarbersManager }          from '@/modules/staff/ui/BarbersManager'

export default async function EquipoPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'barber:read')

  const [barbers, reviewsByBarber] = await Promise.all([
    listAllBarbersWithHours(ctx.id),
    listReviewsByBarber(ctx.id),
  ])

  return <BarbersManager barbers={barbers} tenantSlug={slug} reviewsByBarber={reviewsByBarber} />
}
