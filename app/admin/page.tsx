import Link from 'next/link'
import { ExternalLink, Users, Scissors, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { requireSuperAdmin }          from '@/server/super-admin'
import {
  listOrganizationsForAdmin,
  getPlatformKPIs,
} from '@/modules/tenancy/queries'
import { OrgStatusToggle } from '@/modules/tenancy/ui/OrgStatusToggle'
import { OrgDeleteButton } from '@/modules/tenancy/ui/OrgDeleteButton'
import { CreateBarberiaForm } from '@/modules/identity/ui/CreateBarberiaForm'

const CHURN_DAYS = 30

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

export default async function AdminPage() {
  await requireSuperAdmin()

  const [orgs, kpis] = await Promise.all([
    listOrganizationsForAdmin(),
    getPlatformKPIs(),
  ])

  const churnRisk = orgs.filter((o) => {
    const last = o.appointments[0]?.startAt
    // Solo flaggear orgs que llevan más tiempo que la ventana de churn.
    // Orgs nuevas sin citas no son churn — son onboarding.
    return o.status === 'active'
      && daysSince(o.createdAt) > CHURN_DAYS
      && (!last || daysSince(last) > CHURN_DAYS)
  })

  return (
    <div className="space-y-10">

      {/* ── KPIs plataforma ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPI icon={Scissors}     label="Barberías activas"   value={kpis.activeCount}    />
        <KPI icon={AlertTriangle} label="Suspendidas"         value={kpis.suspendedCount} warn={kpis.suspendedCount > 0} />
        <KPI icon={CalendarDays} label="Citas hoy"           value={kpis.todayCount}     highlight />
        <KPI icon={TrendingUp}   label="Citas esta semana"   value={kpis.weekCount}      />
      </div>

      {/* ── Churn risk ── */}
      {churnRisk.length > 0 && (
        <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">
              {churnRisk.length} {churnRisk.length === 1 ? 'barbería sin' : 'barberías sin'} actividad en +{CHURN_DAYS} días
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {churnRisk.map((o) => (
              <Link
                key={o.id}
                href={`/${o.slug}/panel`}
                className="rounded-lg border border-orange-500/30 px-3 py-1 text-xs font-medium text-orange-300 hover:bg-orange-500/10 transition-colors"
              >
                {o.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Lista barberías ── */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Barberías</h2>
          <span className="ml-auto text-xs text-muted-foreground">{orgs.length} en total</span>
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {orgs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin barberías registradas.</p>
          )}

          {orgs.map((org) => {
            const lastApt  = org.appointments[0]?.startAt
            const isChurn  = org.status === 'active' && (!lastApt || daysSince(lastApt) > CHURN_DAYS)
            const daysAgo  = lastApt ? daysSince(lastApt) : null

            return (
              <div key={org.id} className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-accent/20 transition-smooth">
                {/* Color swatch */}
                <div
                  className="h-10 w-10 shrink-0 rounded-xl border border-border"
                  style={{ backgroundColor: org.branding?.primaryColor ?? '#E0A300' }}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{org.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium
                      ${org.status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-destructive/10 text-destructive'}`}
                    >
                      {org.status === 'active' ? 'activa' : 'suspendida'}
                    </span>
                    {isChurn && (
                      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                        sin actividad
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{org.slug}
                    {org.city ? ` · ${org.city}` : ''}
                    {daysAgo !== null
                      ? ` · última cita hace ${daysAgo}d`
                      : ' · sin citas aún'}
                  </p>
                </div>

                {/* Counters */}
                <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {org._count.barbers}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {org._count.appointments}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  <OrgStatusToggle orgId={org.id} status={org.status} />
                  <Link
                    href={`/${org.slug}/panel`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs transition-smooth hover:border-primary/50 hover:text-primary"
                  >
                    Panel
                  </Link>
                  <Link
                    href={`/${org.slug}`}
                    target="_blank"
                    className="rounded-lg border border-border p-1.5 text-xs transition-smooth hover:border-primary/50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <OrgDeleteButton
                    orgId={org.id}
                    slug={org.slug}
                    name={org.name}
                    appointments={org._count.appointments}
                    barbers={org._count.barbers}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Crear barbería ── */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Crear barbería</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <CreateBarberiaForm />
        </div>
      </section>

    </div>
  )
}

function KPI({
  icon: Icon, label, value, highlight, warn,
}: {
  icon:      React.ComponentType<{ className?: string }>
  label:     string
  value:     number
  highlight?: boolean
  warn?:      boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
        <Icon className={`h-3.5 w-3.5 ${warn ? 'text-orange-400' : highlight ? 'text-primary' : ''}`} />
        {label}
      </div>
      <p className={`mt-1 text-3xl font-bold ${warn ? 'text-orange-400' : highlight ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  )
}
