import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { WidgetShare }       from '@/modules/tenancy/ui/WidgetShare'

export const metadata = { title: 'Widget de reservas' }

export default async function WidgetPage({
  params,
}: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'settings:update')

  return <WidgetShare tenantSlug={slug} />
}
