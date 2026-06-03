import { DollarSign, CalendarDays, Scissors, TrendingUp } from 'lucide-react'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { getDashboardKPIs, getTodayAppointments } from '@/modules/analytics/queries'
import { signOutAction } from '@/modules/identity/actions'
import { formatCop } from '@/shared/format'
import { StatCard }    from '@/modules/analytics/ui/StatCard'
import { AgendaBoard } from '@/modules/scheduling/ui/AgendaBoard'

export default async function PanelPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const [kpis, appointments] = await Promise.all([
    getDashboardKPIs(ctx.id, ctx.timezone),
    getTodayAppointments(ctx.id, ctx.timezone),
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-wide">{ctx.name}</h1>
            <p className="text-xs text-muted-foreground">Panel de gestión</p>
          </div>
          <div className="flex items-center gap-4">
            <a href={`/${slug}`} className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
              Ver página pública →
            </a>
            <form action={signOutAction}>
              <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">

        {/* KPIs */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Hoy
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label="Ingresos hoy"
              value={formatCop(kpis.earningsToday)}
              hint={`${kpis.cutsToday} citas completadas`}
              highlight
            />
            <StatCard
              icon={CalendarDays}
              label="Pendientes"
              value={String(kpis.pendingToday)}
              hint="Citas confirmadas"
            />
            <StatCard
              icon={Scissors}
              label="Top barbero"
              value={
                kpis.topBarber
                  ? (kpis.topBarber.nickname ?? kpis.topBarber.displayName.split(' ')[0])
                  : '—'
              }
              hint="Más citas hoy"
            />
            <StatCard
              icon={TrendingUp}
              label="Esta semana"
              value={formatCop(kpis.earningsWeek)}
              hint="Citas completadas"
            />
          </div>
        </section>

        {/* Agenda del día */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Agenda de hoy · {appointments.length} citas
          </h2>
          <AgendaBoard appointments={appointments} tenantSlug={slug} />
        </section>

      </main>
    </div>
  )
}
