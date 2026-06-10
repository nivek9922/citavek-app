import Link from 'next/link'
import {
  Building2, AlertTriangle, CalendarDays, TrendingUp,
  ShieldAlert, Activity,
} from 'lucide-react'
import { requireSuperAdmin }          from '@/server/super-admin'
import { listOrganizationsForAdmin, getPlatformKPIs } from '@/modules/tenancy/queries'
import { Avatar, AvatarFallback }     from '@/shared/ui/avatar'

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
    return o.status === 'active'
      && daysSince(o.createdAt) > CHURN_DAYS
      && (!last || daysSince(last) > CHURN_DAYS)
  })

  const healthCounts = {
    green:      orgs.filter((o) => o.health.level === 'green').length,
    yellow:     orgs.filter((o) => o.health.level === 'yellow').length,
    red:        orgs.filter((o) => o.health.level === 'red').length,
    onboarding: orgs.filter((o) => o.health.level === 'onboarding').length,
  }

  return (
    <div className="space-y-8">

      {/* ── Título de sección ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado global de la plataforma en tiempo real.
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPI
          icon={Building2}
          label="Negocios activos"
          value={kpis.activeCount}
          sub="cuentas en la plataforma"
        />
        <KPI
          icon={ShieldAlert}
          label="Suspendidos"
          value={kpis.suspendedCount}
          sub="requieren atención"
          warn={kpis.suspendedCount > 0}
        />
        <KPI
          icon={CalendarDays}
          label="Citas hoy"
          value={kpis.todayCount}
          sub="en curso hoy (UTC)"
          highlight
        />
        <KPI
          icon={TrendingUp}
          label="Esta semana"
          value={kpis.weekCount}
          sub="acumuladas lunes–hoy"
        />
      </div>

      {/* ── Salud de la plataforma ── */}
      <section className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-5 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Salud de la plataforma</h2>
          <span className="ml-auto text-xs text-muted-foreground">últimos 7 días</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HealthStat
            count={healthCounts.green}
            label="Saludables"
            sub="≥5 citas netas"
            color="text-green-400"
            bg="bg-green-500/10"
            border="border-green-500/20"
          />
          <HealthStat
            count={healthCounts.yellow}
            label="Moderada"
            sub="1–4 citas netas"
            color="text-yellow-400"
            bg="bg-yellow-500/10"
            border="border-yellow-500/20"
          />
          <HealthStat
            count={healthCounts.red}
            label="En riesgo"
            sub="0 o más bajas que altas"
            color="text-destructive"
            bg="bg-destructive/10"
            border="border-destructive/20"
          />
          <HealthStat
            count={healthCounts.onboarding}
            label="Nuevos"
            sub="≤14 días, aún configurando"
            color="text-blue-400"
            bg="bg-blue-500/10"
            border="border-blue-500/20"
          />
        </div>
      </section>

      {/* ── Alertas de churn ── */}
      {churnRisk.length > 0 && (
        <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="mb-4 flex items-center gap-2 text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">
              {churnRisk.length}{' '}
              {churnRisk.length === 1 ? 'negocio sin' : 'negocios sin'} actividad en +{CHURN_DAYS} días
            </p>
            <Link
              href="/admin/negocios"
              className="ml-auto text-xs text-orange-400/80 underline-offset-2 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {churnRisk.map((o) => (
              <Link
                key={o.id}
                href={`/${o.slug}/panel`}
                className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs font-medium text-orange-300 hover:bg-orange-500/10 transition-colors"
              >
                <Avatar className="h-5 w-5 rounded-md border-0">
                  <AvatarFallback
                    style={{ backgroundColor: o.branding?.primaryColor ?? '#E0A300' }}
                    className="rounded-md text-white text-[9px] font-bold"
                  >
                    {o.name[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                {o.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Accesos rápidos ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/admin/negocios"
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Gestionar negocios</p>
              <p className="text-xs text-muted-foreground">Crear, suspender o eliminar cuentas</p>
            </div>
          </Link>
          <Link
            href="/admin/codigos"
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">Códigos de acceso</p>
              <p className="text-xs text-muted-foreground">Generar invitaciones para nuevos negocios</p>
            </div>
          </Link>
        </div>
      </section>

    </div>
  )
}

function KPI({
  icon: Icon, label, value, sub, highlight, warn,
}: {
  icon:       React.ComponentType<{ className?: string }>
  label:      string
  value:      number
  sub:        string
  highlight?: boolean
  warn?:      boolean
}) {
  const accent = warn ? 'text-orange-400' : highlight ? 'text-primary' : 'text-foreground'
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
        <Icon className={`h-3.5 w-3.5 ${warn ? 'text-orange-400' : highlight ? 'text-primary' : ''}`} />
        {label}
      </div>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function HealthStat({
  count, label, sub, color, bg, border,
}: {
  count:  number
  label:  string
  sub:    string
  color:  string
  bg:     string
  border: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{count}</p>
      <p className={`mt-0.5 text-sm font-medium ${color}`}>{label}</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{sub}</p>
    </div>
  )
}
