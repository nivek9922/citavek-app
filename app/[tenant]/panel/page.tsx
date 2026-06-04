import { DollarSign, CalendarDays, Scissors, TrendingUp } from 'lucide-react'
import { format, addDays, parseISO, differenceInCalendarDays, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { getDashboardKPIs, getAppointmentsForDate, tenantToday } from '@/modules/analytics/queries'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers }  from '@/modules/staff/queries'
import { formatCop } from '@/shared/format'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard }   from '@/modules/analytics/ui/StatCard'
import { AgendaBoard }   from '@/modules/scheduling/ui/AgendaBoard'
import { AgendaDateNav } from '@/modules/scheduling/ui/AgendaDateNav'
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
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { tenant: slug } = await params
  const { date }         = await searchParams
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const today        = tenantToday(ctx.timezone)
  const selectedDate = isValidDateStr(date) ? date : today
  const prevDate     = format(addDays(parseISO(selectedDate), -1), 'yyyy-MM-dd')
  const nextDate     = format(addDays(parseISO(selectedDate),  1), 'yyyy-MM-dd')

  const [kpis, appointments, services, barbers] = await Promise.all([
    getDashboardKPIs(ctx.id, ctx.timezone),
    getAppointmentsForDate(ctx.id, ctx.timezone, selectedDate),
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

      {/* Agenda navegable por día */}
      <section>
        <AgendaDateNav
          slug={slug}
          label={dayLabel(selectedDate, today)}
          prevDate={prevDate}
          nextDate={nextDate}
          isToday={selectedDate === today}
          count={appointments.length}
        />
        <AgendaBoard appointments={appointments} tenantSlug={slug} />
      </section>
    </div>
  )
}
