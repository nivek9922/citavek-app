import 'server-only'
import { cache } from 'react'
import { cacheTag, cacheLife } from 'next/cache'
import { addDays, format, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { db } from '@/server/db'
import type { Prisma } from '@/generated/prisma/client'
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

// Proyección compartida día/semana. Una cita tiene 1+ servicios: se traen como
// líneas y se aplanan a `services` en el mapper.
const agendaSelect = {
  id: true, startAt: true, endAt: true, status: true,
  customerName: true, customerPhone: true, priceCop: true, notes: true,
  redemptionFailed: true,
  appointmentServices: { select: { durationMin: true, service: { select: { name: true } } } },
  barber: { select: { id: true, displayName: true, nickname: true } },
} satisfies Prisma.AppointmentSelect

type AgendaRowRaw = Prisma.AppointmentGetPayload<{ select: typeof agendaSelect }>

function mapAgendaRow(a: AgendaRowRaw) {
  const { appointmentServices, ...rest } = a
  return {
    ...rest,
    services: appointmentServices.map((s) => ({ name: s.service.name, durationMin: s.durationMin })),
  }
}

export type AppointmentRow = ReturnType<typeof mapAgendaRow>

export async function getAppointmentsForDate(
  organizationId: string,
  timezone: string,
  dateStr: string,
  barberId?: string,
): Promise<AppointmentRow[]> {
  const { start, end } = localDayBoundsUTC(dateStr, timezone)

  const rows = await db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: start, lt: end },
      status:  { not: 'cancelled' },
      ...(barberId && { barberId }),
    },
    orderBy: { startAt: 'asc' },
    select: agendaSelect,
  })
  return rows.map(mapAgendaRow)
}

// ── Telemetría de login de barberos (Super Admin — B5) ───────────────────────

export async function getBarberLoginAdoptionStats() {
  const [row] = await db.$queryRaw<[{
    total_barbers:        number
    barbers_with_login:   number
    tenants_fully_linked: number
    tenants_partial:      number
    tenants_total:        number
  }]>`
    SELECT
      SUM(total_count)::int       AS total_barbers,
      SUM(linked_count)::int      AS barbers_with_login,
      COUNT(CASE WHEN linked_count = total_count THEN 1 END)::int AS tenants_fully_linked,
      COUNT(CASE WHEN linked_count < total_count THEN 1 END)::int AS tenants_partial,
      COUNT(*)::int               AS tenants_total
    FROM (
      SELECT
        "organizationId",
        COUNT(*)        AS total_count,
        COUNT("userId") AS linked_count
      FROM barber
      WHERE active = true
      GROUP BY "organizationId"
    ) org_stats
  `

  const totalBarbers     = Number(row.total_barbers)
  const barbersWithLogin = Number(row.barbers_with_login)

  return {
    totalBarbers,
    barbersWithLogin,
    barbersWithoutLogin: totalBarbers - barbersWithLogin,
    loginRatioPct:       totalBarbers > 0 ? Math.round((barbersWithLogin / totalBarbers) * 100) : 0,
    tenantsFullyLinked:  Number(row.tenants_fully_linked),
    tenantsPartial:      Number(row.tenants_partial),
    tenantsTotal:        Number(row.tenants_total),
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

  const rows = await db.appointment.findMany({
    where: {
      organizationId,
      startAt: { gte: start, lt: end },
      status:  { not: 'cancelled' },
      ...(barberId && { barberId }),
    },
    orderBy: { startAt: 'asc' },
    select: agendaSelect,
  })

  const grouped: Record<string, AppointmentRow[]> = Object.fromEntries(days.map((d) => [d, []]))
  for (const apt of rows.map(mapAgendaRow)) {
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

  const [orgs, total, volume, revenue, barbers] = await Promise.all([
    db.organization.findMany({
      select: { id: true, name: true, slug: true, status: true, createdAt: true },
      take:   1000,
    }),
    db.organization.count(),
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

  return {
    rows: orgs
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
      .sort((a, b) => b.appointments30d - a.appointments30d), // heavy users arriba
    total,
  }
}

export type TenantPerformanceRow = Awaited<ReturnType<typeof getTenantsPerformance>>['rows'][number]

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

  // Lealtad (adopción de feature)
  loyaltyActive: boolean
  loyaltyCards:  number
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
export const getOrgStats = cache(async function getOrgStats(organizationId: string): Promise<OrgStats> {
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
    uniqueClientsThisMonth, newClients, returningClientsThisMonth,
    created7, cancelled7, created30, created90,
    lastApt, activeBarbers, onlineApt, topServiceThisMonth,
    loyaltyProgram, loyaltyCards,
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
    // Fix A: COUNT(DISTINCT) en BD — elimina findMany + .length en JS
    db.$queryRaw<[{ count: number }]>`
      SELECT COUNT(DISTINCT "customerPhone")::int AS count
      FROM appointment
      WHERE "organizationId" = ${organizationId}
        AND "startAt" >= ${monthStart}
        AND status != 'cancelled'
    `.then(([r]) => Number(r.count)),
    db.customer.count({ where: { organizationId, createdAt: { gte: weekStart } } }),
    // Fix C: HAVING COUNT(*) >= 2 en BD — elimina groupBy + .filter().length en JS
    db.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "customerPhone"
        FROM appointment
        WHERE "organizationId" = ${organizationId}
          AND "startAt" >= ${since30}
          AND status != 'cancelled'
        GROUP BY "customerPhone"
        HAVING COUNT(*) >= 2
      ) sub
    `.then(([r]) => Number(r.count)),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since7  } } }),
    db.appointment.count({ where: { organizationId, cancelledAt: { gte: since7  } } }),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since30 } } }),
    db.appointment.count({ where: { organizationId, createdAt:   { gte: since90 } } }),
    db.appointment.findFirst({ where: { organizationId }, orderBy: { startAt: 'desc' }, select: { startAt: true } }),
    db.barber.count({ where: { organizationId, active: true } }),
    db.appointment.findFirst({ where: { organizationId, source: 'online' }, select: { id: true } }),
    // Fix B: JOIN + GROUP BY + ORDER BY + LIMIT 1 en BD — elimina findMany + Map + sort en JS
    db.$queryRaw<{ name: string; appointment_count: number }[]>`
      SELECT s.name, COUNT(*)::int AS appointment_count
      FROM appointment_service aps
      JOIN service s ON s.id = aps."serviceId"
      JOIN appointment a ON a.id = aps."appointmentId"
      WHERE a."organizationId" = ${organizationId}
        AND a."startAt" >= ${monthStart}
        AND a.status != 'cancelled'
      GROUP BY s.id, s.name
      ORDER BY appointment_count DESC
      LIMIT 1
    `.then(([r]) => r ? { name: r.name, appointmentCount: Number(r.appointment_count) } : null),
    db.loyaltyProgram.findUnique({ where: { organizationId }, select: { isActive: true } }),
    db.loyaltyCard.count({ where: { organizationId } }),
  ])

  const statusBy   = new Map(byStatus.map((r) => [r.status, r._count._all]))
  const completed  = statusBy.get('completed') ?? 0
  const noShow     = statusBy.get('no_show')   ?? 0
  const cancelled  = statusBy.get('cancelled') ?? 0
  const pending    = (statusBy.get('pending') ?? 0) + (statusBy.get('confirmed') ?? 0)

  return {
    appointmentsToday:     todayCount,
    appointmentsThisWeek:  weekCount,
    appointmentsThisMonth: completed + noShow + pending,   // no canceladas del mes
    appointmentsByStatus:  { completed, noShow, cancelled, pending },

    totalServices,
    activeServices,

    uniqueClientsThisMonth,
    newClientsThisWeek:        newClients,
    returningClientsThisMonth,

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

    loyaltyActive: loyaltyProgram?.isActive ?? false,
    loyaltyCards,
  }
})
