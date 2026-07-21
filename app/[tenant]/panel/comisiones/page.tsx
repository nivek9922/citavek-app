import { getTenantContext } from '@/server/tenant'
import { requireMembership, requirePermission } from '@/server/auth-guards'
import { getBarberByUserId } from '@/modules/staff/queries'
import { tenantToday } from '@/modules/analytics/domain/date-utils'
import {
  getCommissionConfigs,
  getDailyClosingForDate,
  getSettlementHistory,
  getBarberEarningsSummary,
} from '@/modules/commissions/queries'
import { CommissionsPanel } from '@/modules/commissions/ui/CommissionsPanel'
import { BarberEarningsView } from '@/modules/commissions/ui/BarberEarningsView'
import { getVocabulary } from '@/shared/vocabulary'

function isValidDateStr(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export default async function ComisionesPage({
  params,
  searchParams,
}: {
  params:       Promise<{ tenant: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { tenant: slug } = await params
  const { date }         = await searchParams
  const ctx = await getTenantContext(slug)
  const { session, member } = await requireMembership(ctx.id)

  // ── Vista del profesional: solo sus propias ganancias. El barberId se resuelve
  //    server-side desde el userId autenticado (nunca del cliente). ───────────
  if (member.role === 'barber') {
    const barber = await getBarberByUserId(ctx.id, session.user.id)
    if (!barber) {
      const v = getVocabulary(ctx.businessType)
      return (
        <p className="text-sm text-muted-foreground">
          Tu usuario no está vinculado a un {v.professionalSingularLower} activo. Contacta al administrador.
        </p>
      )
    }
    const [summary, settlements] = await Promise.all([
      getBarberEarningsSummary(ctx.id, ctx.timezone, barber.id),
      getSettlementHistory(ctx.id, barber.id),
    ])
    return <BarberEarningsView summary={summary} settlements={settlements} barberName={barber.displayName} />
  }

  // ── Vista del owner ─────────────────────────────────────────────────────────
  await requirePermission(ctx.id, 'commission:read:all')

  const dateStr = isValidDateStr(date) ? date : tenantToday(ctx.timezone)
  const [configs, closing, settlements] = await Promise.all([
    getCommissionConfigs(ctx.id),
    getDailyClosingForDate(ctx.id, ctx.timezone, dateStr),
    getSettlementHistory(ctx.id),
  ])

  return (
    <CommissionsPanel
      tenantSlug={slug}
      closing={closing}
      closingDate={dateStr}
      configs={configs}
      settlements={settlements}
    />
  )
}
