import { Suspense } from 'react'
import {
  CalendarDays, CalendarRange, Users, UserCheck, Activity,
  TrendingDown, TrendingUp, Scissors, Trophy, Check, X, Sparkles, CreditCard,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { requireSuperAdmin } from '@/server/super-admin'
import { getOrgStats, type OrgStats } from '@/modules/analytics/queries'
import { getTeamStats, listAllBarbersWithHours } from '@/modules/staff/queries'
import { getSubscriptionForAdmin } from '@/modules/subscriptions/queries'
import { SubscriptionManager } from '@/modules/subscriptions/ui/SubscriptionManager'
import { SubscriptionStatusBadge, PlanBadge } from '@/modules/subscriptions/ui/subscription-badges'
import { formatCop } from '@/shared/format'
import { StatCard } from '@/modules/analytics/ui/StatCard'
import { FunnelBar, HealthStat } from '@/modules/analytics/ui/admin-widgets'
import type { HealthLevel } from '@/modules/tenancy/domain/health-score'
import type { ChurnTrend } from '@/modules/tenancy/domain/churn-score'
import { AdminNoteCard } from './AdminNoteCard'

export default async function NegocioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSuperAdmin()
  const { id } = await params

  return (
    <div className="space-y-6">
      <Suspense fallback={<GridSkeleton cards={4} />}>
        <KpiSection orgId={id} />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-56" />}>
        <SubscriptionSection orgId={id} />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-56" />}>
        <HealthSection orgId={id} />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-64" />}>
        <TeamSection orgId={id} />
      </Suspense>

      <Suspense fallback={<CardSkeleton className="h-56" />}>
        <OnboardingSection orgId={id} />
      </Suspense>

      <Suspense fallback={<GridSkeleton cards={2} />}>
        <TopSection orgId={id} />
      </Suspense>

      <AdminNoteCard orgId={id} />
    </div>
  )
}

// ── Sección 1 — KPIs ─────────────────────────────────────────────────────────

async function KpiSection({ orgId }: { orgId: string }) {
  const [stats, team] = await Promise.all([getOrgStats(orgId), getTeamStats(orgId)])
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard icon={CalendarDays}  label="Citas hoy"          value={String(stats.appointmentsToday)}      hint="agendadas para hoy" highlight />
      <StatCard icon={CalendarRange} label="Citas este mes"     value={String(stats.appointmentsThisMonth)}  hint="no canceladas" />
      <StatCard icon={Users}         label="Clientes únicos mes" value={String(stats.uniqueClientsThisMonth)} hint={`${stats.newClientsThisWeek} nuevos esta semana`} />
      <StatCard icon={UserCheck}     label="Barberos activos"   value={String(team.total)}                   hint={`${team.withAccount} con cuenta`} />
    </div>
  )
}

// ── Sección — Suscripción ─────────────────────────────────────────────────────

function fmtDate(d: Date | null): string {
  return d ? format(d, "d 'de' MMM, yyyy", { locale: es }) : '—'
}

async function SubscriptionSection({ orgId }: { orgId: string }) {
  const { record } = await getSubscriptionForAdmin(orgId)

  if (!record) {
    return (
      <SectionCard icon={CreditCard} title="Suscripción">
        <p className="text-sm text-muted-foreground">Este negocio aún no tiene suscripción registrada.</p>
      </SectionCard>
    )
  }

  const periodEnd = record.status === 'trial' ? record.trialEndsAt : record.currentPeriodEnd

  return (
    <SectionCard icon={CreditCard} title="Suscripción">
      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge plan={record.plan} />
        <SubscriptionStatusBadge status={record.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Field label={record.status === 'trial' ? 'Vence la prueba' : 'Vence el período'} value={fmtDate(periodEnd)} />
        <Field label="Inicio del período" value={fmtDate(record.currentPeriodStart)} />
        <Field
          label="Último pago"
          value={record.lastPaymentAt
            ? `${fmtDate(record.lastPaymentAt)}${record.lastPaymentAmount ? ` · ${formatCop(record.lastPaymentAmount)}` : ''}`
            : '—'}
        />
        <Field label="Método" value={record.paymentMethod ?? '—'} />
      </dl>

      {record.status === 'cancelled' && record.cancelReason && (
        <p className="mt-3 text-xs text-muted-foreground">Motivo: {record.cancelReason}</p>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <SubscriptionManager orgId={orgId} status={record.status} />
      </div>
    </SectionCard>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize">{value}</dd>
    </div>
  )
}

// ── Sección 2 — Salud y actividad ────────────────────────────────────────────

const HEALTH_STYLE: Record<HealthLevel, { label: string; sub: string; color: string; bg: string; border: string }> = {
  green:      { label: 'Saludable', sub: '≥5 citas netas (7d)',  color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
  yellow:     { label: 'Moderada',  sub: '1–4 citas netas (7d)', color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  red:        { label: 'En riesgo', sub: '0 citas netas (7d)',   color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  onboarding: { label: 'Nuevo',     sub: '≤14 días de antigüedad', color: 'text-blue-400',  bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
}

const CHURN_STYLE: Record<ChurnTrend, { label: string; color: string; bg: string; border: string }> = {
  growing:   { label: 'Creciendo', color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20' },
  stable:    { label: 'Estable',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  declining: { label: 'Cayendo',   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  dormant:   { label: 'Dormido',   color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
}

async function HealthSection({ orgId }: { orgId: string }) {
  const stats = await getOrgStats(orgId)
  const h = HEALTH_STYLE[stats.health.level]
  const c = CHURN_STYLE[stats.churn.trend]
  const atRisk = stats.churn.trend === 'declining' || stats.churn.trend === 'dormant'

  return (
    <SectionCard icon={Activity} title="Salud y actividad" aside="últimos 7 días">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HealthStat
          count={stats.health.score}
          label={h.label}
          sub={`${stats.health.created} creadas · ${stats.health.cancelled} canceladas`}
          color={h.color} bg={h.bg} border={h.border}
        />
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
          <div className="flex items-center gap-1.5">
            {atRisk ? <TrendingDown className={`h-4 w-4 ${c.color}`} /> : <TrendingUp className={`h-4 w-4 ${c.color}`} />}
            <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{stats.churn.score}</p>
          </div>
          <p className={`mt-0.5 text-sm font-medium ${c.color}`}>Churn · {c.label}</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {atRisk ? '⚠ Riesgo de abandono' : 'Riesgo de abandono (0–100)'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium">Última cita</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.lastAppointmentAt
              ? `hace ${formatDistanceToNow(stats.lastAppointmentAt, { locale: es })}`
              : 'Sin citas registradas aún.'}
          </p>
          <StatusBreakdown by={stats.appointmentsByStatus} />
        </div>
      </div>
    </SectionCard>
  )
}

function StatusBreakdown({ by }: { by: OrgStats['appointmentsByStatus'] }) {
  const items = [
    { label: 'Completadas', value: by.completed, cls: 'text-green-400' },
    { label: 'Pendientes',  value: by.pending,   cls: 'text-foreground' },
    { label: 'No-show',     value: by.noShow,    cls: 'text-orange-400' },
    { label: 'Canceladas',  value: by.cancelled, cls: 'text-destructive' },
  ]
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border pt-3">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{i.label}</span>
          <span className={`font-medium tabular-nums ${i.cls}`}>{i.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Sección 3 — Equipo ───────────────────────────────────────────────────────

async function TeamSection({ orgId }: { orgId: string }) {
  const [team, roster] = await Promise.all([getTeamStats(orgId), listAllBarbersWithHours(orgId)])
  const weekByBarber = new Map(team.weekStats.map((s) => [s.barber!.id, s.count]))
  const active = roster.filter((b) => b.active)
  const adoptionPct = team.total > 0 ? Math.round((team.withAccount / team.total) * 100) : 0

  return (
    <SectionCard icon={Users} title="Equipo" aside={`${adoptionPct}% con cuenta`}>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este negocio aún no tiene barberos activos.</p>
      ) : (
        <>
          <FunnelBar label="Adopción de login" count={team.withAccount} total={team.total} color="bg-primary" />
          <div className="mt-4 divide-y divide-border rounded-xl border border-border overflow-hidden">
            {active.map((b) => (
              <div key={b.id} className="flex items-center gap-3 bg-card/40 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {b.displayName}
                  {b.nickname && <span className="ml-1 text-xs text-muted-foreground">· {b.nickname}</span>}
                </span>
                {b.userId
                  ? <span className="inline-flex shrink-0 items-center gap-1 text-xs text-green-400"><Check className="h-3.5 w-3.5" /> cuenta</span>
                  : <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /> sin cuenta</span>}
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {weekByBarber.get(b.id) ?? 0} citas/sem
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  )
}

// ── Sección 4 — Onboarding DNA ───────────────────────────────────────────────

async function OnboardingSection({ orgId }: { orgId: string }) {
  const { onboardingDna: dna } = await getOrgStats(orgId)
  const steps = [
    { label: 'Logo subido',           done: dna.hasLogo },
    { label: 'Color personalizado',   done: dna.hasPrimaryColor },
    { label: 'Primer barbero activo', done: dna.hasBarber },
    { label: 'Primer servicio activo', done: dna.hasService },
    { label: '1ª cita online recibida', done: dna.hasFirstOnlineAppointment },
  ]
  const completed = steps.filter((s) => s.done).length

  return (
    <SectionCard icon={Sparkles} title="Onboarding DNA" aside={`${completed}/${steps.length} pasos`}>
      <FunnelBar label="Progreso de activación" count={completed} total={steps.length} color="bg-cyan-500" />
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            {s.done
              ? <Check className="h-4 w-4 text-green-400" />
              : <X className="h-4 w-4 text-muted-foreground/50" />}
            <span className={s.done ? '' : 'text-muted-foreground'}>{s.label}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

// ── Sección 5 — Top performers ───────────────────────────────────────────────

async function TopSection({ orgId }: { orgId: string }) {
  const [stats, team] = await Promise.all([getOrgStats(orgId), getTeamStats(orgId)])
  const topBarber  = team.topThisMonth
  const topService = stats.topServiceThisMonth

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Top barbero del mes</h2>
        </div>
        {topBarber?.barber ? (
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold">{topBarber.barber.displayName}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{topBarber.count} citas</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin citas este mes todavía.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Servicio más solicitado</h2>
        </div>
        {topService ? (
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold">{topService.name}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{topService.appointmentCount} citas</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin citas este mes todavía.</p>
        )}
      </div>
    </div>
  )
}

// ── Auxiliares de presentación ───────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, aside, children,
}: {
  icon:     React.ComponentType<{ className?: string }>
  title:    string
  aside?:   string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <span className="ml-auto text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function GridSkeleton({ cards }: { cards: number }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${cards === 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-2'}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
      ))}
    </div>
  )
}

function CardSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/40 ${className}`} />
}
