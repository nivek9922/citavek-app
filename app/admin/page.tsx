import Link from 'next/link'
import {
  Building2, AlertTriangle, CalendarDays, TrendingUp,
  ShieldAlert, Activity, Flame, DollarSign, Users, UserCheck,
  CreditCard, Wallet, Hourglass, Sparkles,
} from 'lucide-react'
import { requireSuperAdmin }       from '@/server/super-admin'
import {
  listOrganizationsForAdmin,
  getPlatformKPIs,
  getBrandingAdoptionStats,
  getMonthlyTrafficByOrg,
  getOnboardingFunnel,
} from '@/modules/tenancy/queries'
import { getBarberLoginAdoptionStats } from '@/modules/analytics/queries'
import { getSubscriptionMetrics } from '@/modules/subscriptions/queries'
import { FunnelBar, HealthStat } from '@/modules/analytics/ui/admin-widgets'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'

function formatCOP(cop: number): string {
  if (cop >= 1_000_000) return `${(cop / 1_000_000).toFixed(1)}M`
  if (cop >= 1_000)     return `${Math.round(cop / 1_000)}K`
  return cop.toString()
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

export default async function AdminPage() {
  await requireSuperAdmin()

  const [orgs, kpis, branding, monthlyTraffic, funnel, barberLoginStats, subMetrics] = await Promise.all([
    listOrganizationsForAdmin(),
    getPlatformKPIs(),
    getBrandingAdoptionStats(),
    getMonthlyTrafficByOrg(),
    getOnboardingFunnel(),
    getBarberLoginAdoptionStats(),
    getSubscriptionMetrics(),
  ])

  const healthCounts = {
    green:      orgs.filter((o) => o.health.level === 'green').length,
    yellow:     orgs.filter((o) => o.health.level === 'yellow').length,
    red:        orgs.filter((o) => o.health.level === 'red').length,
    onboarding: orgs.filter((o) => o.health.level === 'onboarding').length,
  }

  // Atención requerida — 3 niveles de urgencia
  const dormant   = orgs.filter((o) => o.status === 'active' && o.churn.trend === 'dormant')
  const declining = orgs.filter((o) => o.status === 'active' && o.churn.trend === 'declining')
  const stuck     = orgs.filter((o) => {
    const age = daysSince(o.createdAt)
    return o.status === 'active' && age > 14 && age <= 90 && o.health.created === 0
  })

  // Top 5 por volumen mensual
  const orgById    = new Map(orgs.map((o) => [o.id, o]))
  const topTenants = monthlyTraffic
    .slice(0, 5)
    .map((row) => ({ ...row, org: orgById.get(row.organizationId) }))
    .filter((r): r is typeof r & { org: NonNullable<typeof r.org> } => r.org != null)

  const hasAlerts = dormant.length > 0 || declining.length > 0 || stuck.length > 0

  return (
    <div className="space-y-8">

      {/* ── Título ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Torre de Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Telemetría global de la plataforma en tiempo real.
        </p>
      </div>

      {/* ── KPI Strip — 6 cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KPI icon={Building2}  label="Negocios activos" value={kpis.activeCount}        sub="cuentas activas" />
        <KPI icon={ShieldAlert} label="Suspendidos"      value={kpis.suspendedCount}     sub="requieren atención" warn={kpis.suspendedCount > 0} />
        <KPI icon={CalendarDays} label="Citas hoy"       value={kpis.todayCount}         sub="en curso hoy (UTC)" highlight />
        <KPI icon={TrendingUp}  label="Esta semana"      value={kpis.weekCount}          sub="acumuladas lunes–hoy" />
        <KPI icon={Activity}    label="Este mes"         value={kpis.monthCount}         sub="citas procesadas" />
        <KPI icon={DollarSign}  label="Revenue mes"      value={formatCOP(kpis.monthRevenueCop)} sub="COP facturado" />
      </div>

      {/* ── MRR Manual (suscripciones) ── */}
      <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">MRR Manual</h2>
          <span className="ml-auto text-xs text-muted-foreground">cobro manual · plan básico</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MrrStat icon={Wallet}     label="Cobrado este mes" value={`${formatCOP(subMetrics.collectedThisMonthCop)}`} sub="COP · pagos activos" accent="text-green-400" />
          <MrrStat icon={Sparkles}   label="En prueba"        value={subMetrics.byStatus.trial}
            sub={subMetrics.trialsEndingSoon > 0 ? `${subMetrics.trialsEndingSoon} vencen en ≤7 días` : 'sin vencimientos próximos'}
            accent={subMetrics.trialsEndingSoon > 0 ? 'text-yellow-400' : undefined} />
          <MrrStat icon={Hourglass}  label="En gracia"        value={subMetrics.byStatus.grace}    sub="acción requerida" accent={subMetrics.byStatus.grace > 0 ? 'text-orange-400' : undefined} />
          <MrrStat icon={ShieldAlert} label="Suspendidas"     value={subMetrics.byStatus.suspended} sub="sin operar"       accent={subMetrics.byStatus.suspended > 0 ? 'text-destructive' : undefined} />
          <MrrStat icon={TrendingUp} label="Proyección MRR"   value={`${formatCOP(subMetrics.projectedMrrCop)}`} sub="COP si todas pagan" accent="text-primary" />
        </div>
      </section>

      {/* ── Torre de Control — 3 columnas ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Adopción de Marca */}
        <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Adopción de Marca</h2>
          </div>
          <FunnelBar label="Logo subido"          count={branding.withLogo}        total={branding.totalActive} color="bg-violet-500" />
          <FunnelBar label="Color personalizado"  count={branding.withCustomColor} total={branding.totalActive} color="bg-indigo-500" />
          {branding.totalActive > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {branding.totalActive - branding.withLogo}{' '}
              {branding.totalActive - branding.withLogo !== 1 ? 'negocios sin' : 'negocio sin'} logo aún
            </p>
          )}
        </section>

        {/* Salud 7 días */}
        <section className="rounded-2xl border border-border bg-card/40 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Salud de la plataforma</h2>
            <span className="ml-auto text-xs text-muted-foreground">últimos 7 días</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <HealthStat count={healthCounts.green}      label="Saludables" sub="≥5 citas netas"  color="text-green-400"   bg="bg-green-500/10"    border="border-green-500/20" />
            <HealthStat count={healthCounts.yellow}     label="Moderada"   sub="1–4 citas netas" color="text-yellow-400"  bg="bg-yellow-500/10"   border="border-yellow-500/20" />
            <HealthStat count={healthCounts.red}        label="En riesgo"  sub="0 citas netas"   color="text-destructive" bg="bg-destructive/10"  border="border-destructive/20" />
            <HealthStat count={healthCounts.onboarding} label="Nuevos"     sub="≤14 días"        color="text-blue-400"   bg="bg-blue-500/10"     border="border-blue-500/20" />
          </div>
        </section>

        {/* Onboarding DNA */}
        <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Onboarding DNA</h2>
          </div>
          {funnel.total > 0 ? (
            <>
              <FunnelBar label="Perfil completo"         count={funnel.withProfile}           total={funnel.total} color="bg-cyan-500" />
              <FunnelBar label="Primer barbero activo"   count={funnel.withBarber}            total={funnel.total} color="bg-cyan-500" />
              <FunnelBar label="Primer servicio activo"  count={funnel.withService}           total={funnel.total} color="bg-cyan-500" />
              <FunnelBar label="1ª cita online recibida" count={funnel.withOnlineAppointment} total={funnel.total} color="bg-cyan-500" />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos aún.</p>
          )}
        </section>
      </div>

      {/* ── Adopción de Login de Barberos (B5) ── */}
      {barberLoginStats.totalBarbers > 0 && (
        <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Adopción de Login de Barberos</h2>
            <span className="ml-auto text-xs text-muted-foreground">barberos activos en plataforma</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-2xl font-bold tabular-nums text-primary">{barberLoginStats.loginRatioPct}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ratio de adopción</p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-2xl font-bold tabular-nums text-green-400">{barberLoginStats.barbersWithLogin}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Con cuenta activa</p>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-2xl font-bold tabular-nums text-orange-400">{barberLoginStats.barbersWithoutLogin}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Sin cuenta vinculada</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-2xl font-bold tabular-nums">{barberLoginStats.totalBarbers}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total barberos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FunnelBar
              label="Equipos completamente vinculados"
              count={barberLoginStats.tenantsFullyLinked}
              total={barberLoginStats.tenantsTotal}
              color="bg-green-500"
            />
            <FunnelBar
              label="Equipos con barberos sin cuenta"
              count={barberLoginStats.tenantsPartial}
              total={barberLoginStats.tenantsTotal}
              color="bg-orange-500"
            />
          </div>
        </section>
      )}

      {/* ── Atención Requerida ── */}
      {hasAlerts && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            Atención Requerida
          </h2>
          {dormant.length > 0 && (
            <AlertTier
              level="red"
              title={`${dormant.length} ${dormant.length === 1 ? 'negocio dormido' : 'negocios dormidos'} — sin actividad en 30+ días`}
              orgs={dormant}
            />
          )}
          {declining.length > 0 && (
            <AlertTier
              level="orange"
              title={`${declining.length} ${declining.length === 1 ? 'negocio cayendo' : 'negocios cayendo'} — sin reservas esta semana`}
              orgs={declining}
            />
          )}
          {stuck.length > 0 && (
            <AlertTier
              level="yellow"
              title={`${stuck.length} ${stuck.length === 1 ? 'negocio atascado' : 'negocios atascados'} en onboarding — sin primera cita online`}
              orgs={stuck}
            />
          )}
        </section>
      )}

      {/* ── Top Negocios del Mes ── */}
      {topTenants.length > 0 && (
        <section className="rounded-2xl border border-border bg-card/40 p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Top Negocios del Mes</h2>
            <span className="ml-auto text-xs text-muted-foreground">por volumen de citas</span>
          </div>
          <div className="space-y-1">
            {topTenants.map((row, i) => (
              <div
                key={row.organizationId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">
                  #{i + 1}
                </span>
                <Avatar className="h-7 w-7 rounded-lg border-0 shrink-0">
                  <AvatarFallback
                    style={{ backgroundColor: row.org.branding?.primaryColor ?? '#E0A300' }}
                    className="rounded-lg text-white text-[10px] font-bold"
                  >
                    {row.org.name[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">{row.org.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {row._count?._all ?? 0} citas
                </span>
                <span className="text-xs text-muted-foreground tabular-nums ml-4">
                  {formatCOP(row._sum?.priceCop ?? 0)} COP
                </span>
              </div>
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
              <p className="font-medium transition-colors group-hover:text-primary">Gestionar negocios</p>
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
              <p className="font-medium transition-colors group-hover:text-primary">Códigos de acceso</p>
              <p className="text-xs text-muted-foreground">Generar invitaciones para nuevos negocios</p>
            </div>
          </Link>
        </div>
      </section>

    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

function KPI({
  icon: Icon, label, value, sub, highlight, warn,
}: {
  icon:       React.ComponentType<{ className?: string }>
  label:      string
  value:      number | string
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

function MrrStat({
  icon: Icon, label, value, sub, accent,
}: {
  icon:   React.ComponentType<{ className?: string }>
  label:  string
  value:  number | string
  sub:    string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${accent ?? 'text-foreground'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

type OrgSnippet = {
  id:       string
  name:     string
  slug:     string
  branding: { primaryColor: string } | null
}

function AlertTier({
  level, title, orgs,
}: {
  level: 'red' | 'orange' | 'yellow'
  title: string
  orgs:  OrgSnippet[]
}) {
  const colors = {
    red:    { border: 'border-destructive/30',  bg: 'bg-destructive/5',  text: 'text-destructive',  chip: 'border-destructive/20  bg-destructive/5  text-red-300'    },
    orange: { border: 'border-orange-500/30',   bg: 'bg-orange-500/5',  text: 'text-orange-400',   chip: 'border-orange-500/20   bg-orange-500/5   text-orange-300' },
    yellow: { border: 'border-yellow-500/30',   bg: 'bg-yellow-500/5',  text: 'text-yellow-400',   chip: 'border-yellow-500/20   bg-yellow-500/5   text-yellow-300' },
  }
  const c = colors[level]

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <p className={`mb-3 text-sm font-semibold ${c.text} flex items-center gap-2`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {orgs.map((o) => (
          <Link
            key={o.id}
            href={`/${o.slug}/panel`}
            className={`flex items-center gap-2 rounded-xl border ${c.chip} px-3 py-2 text-xs font-medium transition-colors hover:opacity-80`}
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
    </div>
  )
}
