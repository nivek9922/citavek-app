import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { addDays, format, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { db } from '@/server/db'
import { tenantToday, localDayBoundsUTC, currentWeekBoundsUTC } from './domain/date-utils'
import { computeKPIs } from './domain/kpi-calculator'
import { computeHealthScore, type OrgHealth } from '@/modules/tenancy/domain/health-score'
import { computeChurnScore,  type ChurnResult } from '@/modules/tenancy/domain/churn-score'

export { tenantToday } from './domain/date-utils'

// ── KPIs del dashboard (siempre "hoy" + "esta semana") ──────────────────────

export async function getDashboardKPIs(organizationId: string, timezone: string) {
  const today                    = tenantToday(timezone)
  const { start: todayStart, end: todayEnd } = localDayBoundsUTC(today, timezone)
  const { weekStart, weekEnd }   = currentWeekBoundsUTC(timezone)

  const [todayApts, weekApts, barbers] = await Promise.all([
    db.appointment.findMany({
      where:  { organizationId, startAt: { gte: todayStart, lt: todayEnd }, status: { not: 'cancelled' } },
      select: { status: true, priceCop: true, barberId: true },
    }),
    db.appointment.findMany({
      where:  { organizationId, startAt: { gte: weekStart, lt: weekEnd }, status: 'completed' },
      select: { priceCop: true },
    }),
    db.barber.findMany({
      where:  { organizationId, active: true },
      select: { id: true, displayName: true, nickname: true },
    }),
  ])

  return computeKPIs(todayApts, weekApts, barbers)
}

// ── Citas de un día calendario específico (agenda navegable) ────────────────

export async function getAppointmentsForDate(
  organizationId: string,
  timezone: string,
  dateStr: string,
  barberId?: string,
) {
  const { start, end } = localDayBoundsUTC(dateStr, timezone)

  return db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: start, lt: end },
      status:  { not: 'cancelled' },
      ...(barberId && { barberId }),
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true, startAt: true, endAt: true, status: true,
      customerName: true, customerPhone: true, priceCop: true, notes: true,
      service: { select: { name: true, durationMin: true } },
      barber:  { select: { id: true, displayName: true, nickname: true } },
    },
  })
}

export type AppointmentRow = Awaited<ReturnType<typeof getAppointmentsForDate>>[number]

// ── Telemetría de login de barberos (Super Admin — B5) ───────────────────────

export async function getBarberLoginAdoptionStats() {
  const [total, withLogin] = await Promise.all([
    db.barber.count({ where: { active: true } }),
    db.barber.count({ where: { active: true, userId: { not: null } } }),
  ])

  // Tenants con todos los barberos vinculados vs tenants con al menos uno sin vincular
  const allOrgs = await db.barber.groupBy({
    by:     ['organizationId'],
    where:  { active: true },
    _count: { _all: true },
  })
  const linkedOrgs = await db.barber.groupBy({
    by:     ['organizationId'],
    where:  { active: true, userId: { not: null } },
    _count: { _all: true },
  })

  const linkedMap = new Map(linkedOrgs.map((r) => [r.organizationId, r._count._all]))

  let tenantsFullyLinked = 0
  let tenantsPartial     = 0
  for (const org of allOrgs) {
    const linked = linkedMap.get(org.organizationId) ?? 0
    if (linked === org._count._all) tenantsFullyLinked++
    else tenantsPartial++
  }

  return {
    totalBarbers:        total,
    barbersWithLogin:    withLogin,
    barbersWithoutLogin: total - withLogin,
    loginRatioPct:       total > 0 ? Math.round((withLogin / total) * 100) : 0,
    tenantsFullyLinked,
    tenantsPartial,
    tenantsTotal: allOrgs.length,
  }
}

// ── Citas de una semana completa (lun–dom) ───────────────────────────────────

export interface WeekDay {
  dateStr:      string
  appointments: AppointmentRow[]
}

export async function getAppointmentsForWeek(
  organizationId: string,
  timezone: string,
  weekStartStr: string, // YYYY-MM-DD → lunes de la semana
  barberId?: string,
): Promise<WeekDay[]> {
  const days = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStartStr), i), 'yyyy-MM-dd'),
  )

  const lastDayStr = format(addDays(parseISO(weekStartStr), 6), 'yyyy-MM-dd')
  const { start } = localDayBoundsUTC(weekStartStr, timezone)
  const { end }   = localDayBoundsUTC(lastDayStr, timezone)

  const apts = await db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: start, lt: end },
      status:  { not: 'cancelled' },
      ...(barberId && { barberId }),
    },
    orderBy: { startAt: 'asc' },
    select: {
      id: true, startAt: true, endAt: true, status: true,
      customerName: true, customerPhone: true, priceCop: true, notes: true,
      service: { select: { name: true, durationMin: true } },
      barber:  { select: { id: true, displayName: true, nickname: true } },
    },
  })

  const grouped: Record<string, AppointmentRow[]> = Object.fromEntries(days.map((d) => [d, []]))
  for (const apt of apts) {
    const localDate = formatInTimeZone(apt.startAt, timezone, 'yyyy-MM-dd')
    grouped[localDate]?.push(apt)
  }

  return days.map((d) => ({ dateStr: d, appointments: grouped[d] ?? [] }))
}

// ── Rendimiento por tenant (Super Admin — desglose granular, últimos 30 días) ─

/**
 * Super-admin: telemetría de negocio por barbería (cross-tenant, NO tenant-scoped).
 * Lista TODAS las orgs (incluidas las de 0 actividad), ordenadas por volumen de
 * citas desc para destacar a los "heavy users". 4 queries en paralelo, sin N+1:
 * lista de orgs + 3 agregados (citas, facturación, equipo) fusionados con Map.
 */
export async function getTenantsPerformance() {
  'use cache'
  cacheTag('admin-orgs')   // se refresca también al crear/suspender orgs
  cacheLife('hours')       // frescura adecuada para analítica de admin
  const since30 = new Date(Date.now() - 30 * 86_400_000)

  const [orgs, volume, revenue, barbers] = await Promise.all([
    db.organization.findMany({
      select: { id: true, name: true, slug: true, status: true, createdAt: true },
    }),
    db.appointment.groupBy({                       // Citas (30d): no canceladas
      by:     ['organizationId'],
      where:  { startAt: { gte: since30 }, status: { not: 'cancelled' } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({                       // Facturación (30d): completadas
      by:    ['organizationId'],
      where: { startAt: { gte: since30 }, status: 'completed' },
      _sum:  { priceCop: true },
    }),
    db.barber.groupBy({                            // Equipo: barberos activos
      by:     ['organizationId'],
      where:  { active: true },
      _count: { _all: true },
    }),
  ])

  const volumeBy  = new Map(volume.map((r)  => [r.organizationId, r._count._all]))
  const revenueBy = new Map(revenue.map((r) => [r.organizationId, r._sum.priceCop ?? 0]))
  const barbersBy = new Map(barbers.map((r) => [r.organizationId, r._count._all]))

  return orgs
    .map((org) => ({
      id:              org.id,
      name:            org.name,
      slug:            org.slug,
      status:          org.status,
      createdAt:       org.createdAt,
      appointments30d: volumeBy.get(org.id)  ?? 0,
      revenue30dCop:   revenueBy.get(org.id) ?? 0,
      barberCount:     barbersBy.get(org.id) ?? 0,
    }))
    .sort((a, b) => b.appointments30d - a.appointments30d) // heavy users arriba
}

export type TenantPerformanceRow = Awaited<ReturnType<typeof getTenantsPerformance>>[number]

// ── Stats operativas de UNA barbería (Super Admin — drill-down) ──────────────

export interface OrgStats {
  // Citas
  appointmentsToday:     number
  appointmentsThisWeek:  number
  appointmentsThisMonth: number
  appointmentsByStatus:  { completed: number; noShow: number; cancelled: number; pending: number }

  // Servicios
  totalServices:  number
  activeServices: number

  // Clientes
  uniqueClientsThisMonth:    number
  newClientsThisWeek:        number
  returningClientsThisMonth: number   // clientes con 2+ citas en 30 días

  // Salud
  health:            OrgHealth        // nivel + score (creadas − canceladas, 7d)
  churn:             ChurnResult      // score 0-100 + trend
  lastAppointmentAt: Date | null

  // Onboarding DNA
  onboardingDna: {
    hasLogo:                   boolean
    hasPrimaryColor:           boolean
    hasBarber:                 boolean
    hasService:                boolean
    hasFirstOnlineAppointment: boolean
  }

  // Top del mes
  topServiceThisMonth: { name: string; appointmentCount: number } | null
}

/**
 * Telemetría operativa de una barbería específica. Frescura `minutes` (NO `max`):
 * la vista de detalle muestra datos en vivo. El bloque Equipo y `topBarberThisMonth`
 * NO se calculan aquí — la página reusa `getTeamStats(orgId)` (modules/staff).
 *
 * `appointmentsByStatus` y `topServiceThisMonth` se acotan al mes en curso (TZ del
 * tenant) para mantener las queries acotadas. `pending` pliega `pending + confirmed`
 * (citas futuras/activas) ya que el spec no separa `confirmed`.
 */
export async function getOrgStats(organizationId: string): Promise<OrgStats> {
  'use cache'
  cacheTag(`org-stats:${organizationId}`)
  cacheLife('minutes')

  const org = await db.organization.findUniqueOrThrow({
    where:  { id: organizationId },
    select: {
      timezone:  true,
      createdAt: true,
      branding:  { select: { primaryColor: true, logoUrl: true } },
    },
  })
  const tz = org.timezone

  const today = tenantToday(tz)
  const { start: todayStart, end: todayEnd } = localDayBoundsUTC(today, tz)
  const { weekStart, weekEnd } = currentWeekBoundsUTC(tz)
  const { start: monthStart }  = localDayBoundsUTC(`${today.slice(0, 8)}01`, tz)

  const now     = Date.now()
  const since7  = new Date(now -  7 * 86_400_000)
  const since30 = new Date(now - 30 * 86_400_000)
  const since90 = new Date(now - 90 * 86_400_000)
  const ageInDays = Math.floor((now - org.createdAt.getTime()) / 86_400_000)

  const notCancelled = { not: 'cancelled' as const }

  const [
    todayCount, weekCount, byStatus,
    totalServices, activeServices,
    uniquePhones, newClients, returningRows,
    created7, cancelled7, created30, created90,
    lastApt, activeBarbers, onlineApt, topServiceRows,
  ] = await Promise.all([
    db.appointment.count({ where: { organizationId, startAt: { gte: todayStart, lt: todayEnd }, status: notCancelled } }),
    db.appointment.count({ where: { organizationId, startAt: { gte: weekStart,  lt: weekEnd  }, status: notCancelled } }),
    db.appointment.groupBy({
      by:     ['status'],
      where:  { organizationId, startAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    db.service.count({ where: { organizationId } }),
    db.service.count({ where: { organizationId, active: true } }),
    db.appointment.findMany({
      where:    { organizationId, startAt: { gte: monthStart }, status: notCancelled },
      select:   { customerPhone: true },
      distinct: ['customerPhone'],
    }),
    db.customer.count({ where: { organizationId, createdAt: { gte: weekStart } } }),
    db.appointment.groupBy({
      by:     ['customerPhone'],
      where:  { organizationId, startAt: { gte: since30 }, status: notCancelled },
      _count: { _all: true },
    }),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since7  } } }),
    db.appointment.count({ where: { organizationId, cancelledAt: { gte: since7  } } }),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since30 } } }),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since90 } } }),
    db.appointment.findFirst({ where: { organizationId }, orderBy: { startAt: 'desc' }, select: { startAt: true } }),
    db.barber.count({ where: { organizationId, active: true } }),
    db.appointment.findFirst({ where: { organizationId, source: 'online' }, select: { id: true } }),
    db.appointment.groupBy({
      by:      ['serviceId'],
      where:   { organizationId, startAt: { gte: monthStart }, status: notCancelled },
      _count:  { _all: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take:    1,
    }),
  ])

  const statusBy   = new Map(byStatus.map((r) => [r.status, r._count._all]))
  const completed  = statusBy.get('completed') ?? 0
  const noShow     = statusBy.get('no_show')   ?? 0
  const cancelled  = statusBy.get('cancelled') ?? 0
  const pending    = (statusBy.get('pending') ?? 0) + (statusBy.get('confirmed') ?? 0)

  const topRow = topServiceRows[0]
  const topServiceThisMonth = topRow
    ? {
        name: (await db.service.findUnique({ where: { id: topRow.serviceId }, select: { name: true } }))?.name ?? 'Servicio',
        appointmentCount: topRow._count._all,
      }
    : null

  return {
    appointmentsToday:     todayCount,
    appointmentsThisWeek:  weekCount,
    appointmentsThisMonth: completed + noShow + pending,   // no canceladas del mes
    appointmentsByStatus:  { completed, noShow, cancelled, pending },

    totalServices,
    activeServices,

    uniqueClientsThisMonth:    uniquePhones.length,
    newClientsThisWeek:        newClients,
    returningClientsThisMonth: returningRows.filter((r) => r._count._all >= 2).length,

    health: computeHealthScore(created7, cancelled7, ageInDays),
    churn:  computeChurnScore(created7, created30, created90),
    lastAppointmentAt: lastApt?.startAt ?? null,

    onboardingDna: {
      hasLogo:                   org.branding?.logoUrl != null,
      hasPrimaryColor:           org.branding != null && org.branding.primaryColor !== '#E0A300',
      hasBarber:                 activeBarbers > 0,
      hasService:                activeServices > 0,
      hasFirstOnlineAppointment: onlineApt != null,
    },

    topServiceThisMonth,
  }
}
