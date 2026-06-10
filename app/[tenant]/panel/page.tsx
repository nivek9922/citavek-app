import { DollarSign, CalendarDays, Scissors, TrendingUp } from 'lucide-react'
import { format, addDays, parseISO, differenceInCalendarDays, isValid, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import {
  getDashboardKPIs,
  getAppointmentsForDate,
  getAppointmentsForWeek,
  tenantToday,
} from '@/modules/analytics/queries'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers }  from '@/modules/staff/queries'
import { formatCop } from '@/shared/format'
import { cn } from '@/shared/ui/utils'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard }   from '@/modules/analytics/ui/StatCard'
import { AgendaBoard }    from '@/modules/scheduling/ui/AgendaBoard'
import { AgendaDateNav }  from '@/modules/scheduling/ui/AgendaDateNav'
import { AgendaWeekView } from '@/modules/scheduling/ui/AgendaWeekView'
import { NewAppointmentDialog } from '@/modules/scheduling/ui/NewAppointmentDialog'

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
  await requireMembership(ctx.id)

  const today      = tenantToday(ctx.timezone)
  const isWeekView = view === 'week'
  const base       = `/${slug}/panel`

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

  const [kpis, appointments, weekDays, services, barbers] = await Promise.all([
    getDashboardKPIs(ctx.id, ctx.timezone),
    isWeekView ? Promise.resolve([]) : getAppointmentsForDate(ctx.id, ctx.timezone, selectedDate),
    isWeekView ? getAppointmentsForWeek(ctx.id, ctx.timezone, weekStartStr) : Promise.resolve([]),
    listActiveServices(ctx.id),
    listActiveBarbers(ctx.id),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        description={capitalize(format(parseISO(today), "EEEE d 'de' MMMM", { locale: es }))}
        action={
          <NewAppointmentDialog
            tenantSlug={slug}
            services={services}
            barbers={barbers}
            defaultDate={selectedDate}
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

      {/* Agenda con toggle día / semana */}
      <section>
        {/* Toggle */}
        <div className="mb-4 flex items-center gap-2">
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
            <AgendaBoard appointments={appointments} tenantSlug={slug} timezone={ctx.timezone} now={Date.now()} organizationName={ctx.name} />
          </>
        )}
      </section>
    </div>
  )
}
