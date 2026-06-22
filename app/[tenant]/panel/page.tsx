import { DollarSign, CalendarDays, Scissors, TrendingUp } from 'lucide-react'
import { format, addDays, parseISO, differenceInCalendarDays, isValid, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import {
  getDashboardKPIs,
  getAppointmentsForDate,
  getAppointmentsForWeek,
  tenantToday,
} from '@/modules/analytics/queries'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers, getBarberByUserId, getTeamStats } from '@/modules/staff/queries'
import { formatCop } from '@/shared/format'
import { cn } from '@/shared/ui/utils'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard }   from '@/modules/analytics/ui/StatCard'
import { AgendaBoard }    from '@/modules/scheduling/ui/AgendaBoard'
import { AgendaDateNav }  from '@/modules/scheduling/ui/AgendaDateNav'
import { AgendaWeekView } from '@/modules/scheduling/ui/AgendaWeekView'
import { ManualAppointmentModal } from '@/modules/scheduling/ui/ManualAppointmentModal'
import { OnboardingWidget, OnboardingSuccessStrip } from '@/modules/onboarding/ui/OnboardingWidget'
import { OnboardingWizard } from '@/modules/onboarding/ui/OnboardingWizardClient'
import { getAtRiskPhones } from '@/modules/no-show-tracking/queries'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function isValidDateStr(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s))
}

function dayLabel(dateStr: string, todayStr: string) {
  const diff = differenceInCalendarDays(parseISO(dateStr), parseISO(todayStr))
  if (diff === 0)  return 'Hoy'
  if (diff === 1)  return 'Mañana'
  if (diff === -1) return 'Ayer'
  return capitalize(format(parseISO(dateStr), "EEE d 'de' MMM", { locale: es }))
}

export default async function PanelPage({
  params,
  searchParams,
}: {
  params:       Promise<{ tenant: string }>
  searchParams: Promise<{ date?: string; view?: string; week?: string }>
}) {
  const { tenant: slug }      = await params
  const { date, view, week }  = await searchParams
  const ctx = await getTenantContext(slug)
  const { session, member } = await requireMembership(ctx.id)

  const jar = await cookies()
  const dismissed    = jar.get(`ob-dismissed-${ctx.id}`)?.value === '1'
  const wizardSeen   = jar.get(`ob-wizard-${ctx.id}`)?.value === '1'

  const today      = tenantToday(ctx.timezone)
  const isWeekView = view === 'week'
  const base       = `/${slug}/panel`
  const isBarber   = member.role === 'barber'

  // Si es barbero, filtrar la agenda por su barberId vinculado
  const currentBarber = isBarber
    ? await getBarberByUserId(ctx.id, session.user.id)
    : null
  const currentBarberId = currentBarber?.id

  // ── Vista diaria ────────────────────────────────────────────────────────────
  const selectedDate = isValidDateStr(date) ? date : today
  const prevDate     = format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd')
  const nextDate     = format(addDays(parseISO(selectedDate),  1), 'yyyy-MM-dd')

  // ── Vista semanal ───────────────────────────────────────────────────────────
  const todayMonday   = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekStartStr  = isValidDateStr(week) ? format(startOfWeek(parseISO(week), { weekStartsOn: 1 }), 'yyyy-MM-dd') : todayMonday
  const prevWeekStr   = format(addDays(parseISO(weekStartStr), -7), 'yyyy-MM-dd')
  const nextWeekStr   = format(addDays(parseISO(weekStartStr),  7), 'yyyy-MM-dd')
  const weekEndStr    = format(addDays(parseISO(weekStartStr),  6), 'yyyy-MM-dd')
  const weekLabel     = format(parseISO(weekStartStr), "d MMM", { locale: es })
    + ' – '
    + format(parseISO(weekEndStr), "d MMM yyyy", { locale: es })

  const [kpis, appointments, weekDays, services, barbers, teamStats, atRiskPhones] = await Promise.all([
    getDashboardKPIs(ctx.id, ctx.timezone),
    isWeekView ? Promise.resolve([]) : getAppointmentsForDate(ctx.id, ctx.timezone, selectedDate, currentBarberId),
    isWeekView ? getAppointmentsForWeek(ctx.id, ctx.timezone, weekStartStr, currentBarberId) : Promise.resolve([]),
    listActiveServices(ctx.id),
    listActiveBarbers(ctx.id),
    !isBarber ? getTeamStats(ctx.id) : Promise.resolve(null),
    getAtRiskPhones(ctx.id),
  ])

  // Instante de render del servidor: la agenda necesita "ahora" para marcar la
  // hora actual. Página dinámica por request — la impureza es intencional.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now()

  const onboardingSteps = [
    {
      label: 'Personaliza tu marca',
      description: 'Tu logo y portada son lo primero que ven tus clientes al entrar a reservar.',
      completed: ctx.branding.logoUrl !== null || ctx.branding.coverUrl !== null,
      href: 'marca', linkText: 'Ir a Marca',
    },
    {
      label: 'Registra tu primer barbero',
      description: 'Tus clientes eligen con quién se van a cortar. Sin barberos, no hay a quién asignar.',
      completed: barbers.length > 0,
      href: 'equipo', linkText: 'Ir a Equipo',
    },
    {
      label: 'Crea tu primer servicio',
      description: 'Sin servicios en tu carta, tu agenda no puede abrirse. Añade precios y duraciones reales.',
      completed: services.length > 0,
      href: 'servicios', linkText: 'Ir a Servicios',
    },
  ]
  const allDone = onboardingSteps.every((s) => s.completed)

  return (
    <div className="space-y-8">
      {/* Onboarding (marca, equipo, servicios) — solo owner. El barbero no tiene
          permisos para configurar el negocio, así que va directo a su agenda. */}
      {!isBarber && (
        <>
          {!wizardSeen && !allDone && (
            <OnboardingWizard
              slug={slug}
              initialColor={ctx.branding.primaryColor}
              initialLogoUrl={ctx.branding.logoUrl}
              initialCoverUrl={ctx.branding.coverUrl}
            />
          )}

          {allDone ? (
            <OnboardingSuccessStrip slug={slug} />
          ) : !dismissed ? (
            <OnboardingWidget steps={onboardingSteps} slug={slug} />
          ) : null}
        </>
      )}

      <PageHeader
        title="Agenda"
        description={capitalize(format(parseISO(today), "EEEE d 'de' MMMM", { locale: es }))}
        action={
          <ManualAppointmentModal
            tenantSlug={slug}
            services={services}
            barbers={barbers}
            todayStr={today}
            timezone={ctx.timezone}
            currentBarberId={currentBarberId}
          />
        }
      />

      {/* KPIs — siempre snapshot de hoy */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resumen de hoy
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={DollarSign}
            label="Ingresos hoy"
            value={formatCop(kpis.earningsToday)}
            hint={`${kpis.cutsToday} ${kpis.cutsToday === 1 ? 'cita completada' : 'citas completadas'}`}
            highlight
          />
          <StatCard icon={CalendarDays} label="Pendientes" value={String(kpis.pendingToday)} hint="Citas confirmadas" />
          <StatCard
            icon={Scissors}
            label="Top barbero"
            value={kpis.topBarber?.nickname ?? kpis.topBarber?.displayName.split(' ')[0] ?? '—'}
            hint="Más citas hoy"
          />
          <StatCard icon={TrendingUp} label="Esta semana" value={formatCop(kpis.earningsWeek)} hint="Citas completadas" />
        </div>
      </section>

      {/* Estadísticas de equipo — solo owners (B4) */}
      {!isBarber && teamStats && teamStats.total > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Equipo esta semana
          </h2>
          <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
            {teamStats.weekStats.length > 0 ? (
              <div className="space-y-2">
                {teamStats.weekStats.slice(0, 5).map((row) => {
                  if (!row.barber) return null
                  const maxCount = teamStats.weekStats[0]?.count ?? 1
                  const pct = Math.round((row.count / maxCount) * 100)
                  return (
                    <div key={row.barber.id} className="flex items-center gap-3 text-sm">
                      <span className="w-24 truncate text-xs font-medium">
                        {row.barber.nickname ?? row.barber.displayName.split(' ')[0]}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted/50">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                        {row.count}
                      </span>
                      {!row.barber.userId && (
                        <span className="text-[10px] text-orange-400" title="Sin cuenta">
                          Sin cuenta
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin citas esta semana aún.</p>
            )}
            <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="text-green-400 font-medium">{teamStats.withAccount} con cuenta</span>
              <span className="text-orange-400 font-medium">{teamStats.withoutAccount} sin cuenta</span>
            </div>
          </div>
        </section>
      )}

      {/* Agenda con toggle día / semana */}
      <section>
        {/* Toggle — solo desktop/tablet; en móvil la vista diaria es la única (la semanal
            requiere scroll horizontal). Si se llega a ?view=week en móvil aún se renderiza. */}
        <div className="mb-4 hidden items-center gap-2 sm:flex">
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            <Link
              href={`${base}?date=${selectedDate}`}
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-smooth',
                !isWeekView
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Día
            </Link>
            <Link
              href={`${base}?view=week&week=${weekStartStr}`}
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-smooth',
                isWeekView
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Semana
            </Link>
          </div>
        </div>

        {isWeekView ? (
          <AgendaWeekView
            slug={slug}
            weekDays={weekDays}
            todayStr={today}
            prevWeekStr={prevWeekStr}
            nextWeekStr={nextWeekStr}
            weekLabel={weekLabel}
            timezone={ctx.timezone}
          />
        ) : (
          <>
            <AgendaDateNav
              slug={slug}
              label={dayLabel(selectedDate, today)}
              prevDate={prevDate}
              nextDate={nextDate}
              isToday={selectedDate === today}
              count={appointments.length}
            />
            <AgendaBoard appointments={appointments} tenantSlug={slug} timezone={ctx.timezone} now={renderedAt} organizationName={ctx.name} atRiskPhones={atRiskPhones} />
          </>
        )}
      </section>
    </div>
  )
}
