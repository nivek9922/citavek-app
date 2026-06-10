import Link from 'next/link'
import { Suspense } from 'react'
import { AlertTriangle, Scissors, CalendarDays, TrendingUp } from 'lucide-react'
import { requireSuperAdmin } from '@/server/super-admin'
import {
  listOrganizationsForAdmin,
  getPlatformKPIs,
} from '@/modules/tenancy/queries'
import { listAccessCodesAction } from '@/modules/identity/actions'
import { AdminOrgsSection }       from './AdminOrgsSection'
import { AdminFilters }           from './AdminFilters'
import { AdminAccessCodesSection } from './AdminAccessCodesSection'

const CHURN_DAYS = 30

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string }>
}) {
  await requireSuperAdmin()

  const [orgs, kpis, codes, { q, status, city }] = await Promise.all([
    listOrganizationsForAdmin(),
    getPlatformKPIs(),
    listAccessCodesAction(),
    searchParams,
  ])

  // Filtrado server-side: el Server Component hace el trabajo, no el cliente.
  const filtered = orgs.filter((o) => {
    const query = (q ?? '').trim().toLowerCase()
    if (query && !o.name.toLowerCase().includes(query) && !o.slug.toLowerCase().includes(query)) return false
    if (status && status !== 'all' && o.status !== status) return false
    if (city   && city   !== 'all' && o.city   !== city)   return false
    return true
  })

  const churnRisk = orgs.filter((o) => {
    const last = o.appointments[0]?.startAt
    return o.status === 'active'
      && daysSince(o.createdAt) > CHURN_DAYS
      && (!last || daysSince(last) > CHURN_DAYS)
  })

  return (
    <div className="space-y-10">

      {/* ── KPIs plataforma ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPI icon={Scissors}      label="Barberías activas"  value={kpis.activeCount}    />
        <KPI icon={AlertTriangle} label="Suspendidas"         value={kpis.suspendedCount} warn={kpis.suspendedCount > 0} />
        <KPI icon={CalendarDays}  label="Citas hoy"           value={kpis.todayCount}     highlight />
        <KPI icon={TrendingUp}    label="Citas esta semana"   value={kpis.weekCount}      />
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

      {/* ── Códigos de acceso ── */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <AdminAccessCodesSection initialCodes={codes} />
      </div>

      {/* ── Filtros + lista ── */}
      <div className="space-y-4">
        {/* Suspense porque AdminFilters usa useSearchParams() */}
        <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-muted/40" />}>
          <AdminFilters total={orgs.length} filtered={filtered.length} />
        </Suspense>

        <AdminOrgsSection key={`${q ?? ''}-${status ?? ''}-${city ?? ''}`} initialOrgs={filtered} />
      </div>

    </div>
  )
}

function KPI({
  icon: Icon, label, value, highlight, warn,
}: {
  icon:       React.ComponentType<{ className?: string }>
  label:      string
  value:      number
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
