import 'server-only'
import { cacheTag, cacheLife } from 'next/cache'
import { db } from '@/server/db'
import { computeHealthScore } from './domain/health-score'
import { computeChurnScore  } from './domain/churn-score'

const HEALTH_WINDOW_DAYS = 7

/** Datos de configuración + branding del tenant (página "Marca" del panel). */
export async function getOrgSettings(organizationId: string) {
  const [org, branding] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where:  { id: organizationId },
      select: { name: true, city: true, address: true, phone: true },
    }),
    db.branding.findUnique({
      where:  { organizationId },
      select: { primaryColor: true, logoUrl: true, tagline: true, coverUrl: true },
    }),
  ])
  return { org, branding }
}

/**
 * Super-admin: todas las barberías (activas y suspendidas). NO tenant-scoped.
 * Las suspendidas se muestran con su badge para poder reactivarlas, no se ocultan.
 */
export async function listOrganizationsForAdmin() {
  'use cache'
  cacheTag('admin-orgs')
  cacheLife('max')
  const since7  = new Date(Date.now() -  HEALTH_WINDOW_DAYS * 86_400_000)
  const since30 = new Date(Date.now() -  30 * 86_400_000)
  const since90 = new Date(Date.now() -  90 * 86_400_000)

  // 5 queries en paralelo para N tenants (sin N+1): lista + 4 agregados de ventanas temporales.
  const [orgs, created7, cancelled7, created30, created90] = await Promise.all([
    db.organization.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], // activas primero
      select: {
        id: true, name: true, slug: true, city: true, status: true, createdAt: true,
        branding: { select: { primaryColor: true } },
        _count:   { select: { barbers: true, appointments: true } },
        appointments: {
          take:    1,
          orderBy: { startAt: 'desc' },
          select:  { startAt: true },
        },
      },
    }),
    db.appointment.groupBy({
      by:     ['organizationId'],
      where:  { createdAt: { gte: since7 } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by:     ['organizationId'],
      where:  { cancelledAt: { gte: since7 } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by:     ['organizationId'],
      where:  { createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by:     ['organizationId'],
      where:  { createdAt: { gte: since90 } },
      _count: { _all: true },
    }),
  ])

  const createdBy7   = new Map(created7.map((r)   => [r.organizationId, r._count._all]))
  const cancelledBy7 = new Map(cancelled7.map((r)  => [r.organizationId, r._count._all]))
  const createdBy30  = new Map(created30.map((r)   => [r.organizationId, r._count._all]))
  const createdBy90  = new Map(created90.map((r)   => [r.organizationId, r._count._all]))

  return orgs.map((org) => ({
    ...org,
    health: computeHealthScore(
      createdBy7.get(org.id)   ?? 0,
      cancelledBy7.get(org.id) ?? 0,
      Math.floor((Date.now() - org.createdAt.getTime()) / 86_400_000),
    ),
    churn: computeChurnScore(
      createdBy7.get(org.id)  ?? 0,
      createdBy30.get(org.id) ?? 0,
      createdBy90.get(org.id) ?? 0,
    ),
  }))
}

export type AdminOrgRow = Awaited<ReturnType<typeof listOrganizationsForAdmin>>[number]

/** Super-admin: KPIs de toda la plataforma (UTC, cross-tenant). */
export async function getPlatformKPIs() {
  const now        = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek  = now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1  // lunes = 0
  const weekStart  = new Date(todayStart.getTime() - dayOfWeek * 86_400_000)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const [todayCount, weekCount, activeCount, suspendedCount, monthCount, monthRevenue] =
    await Promise.all([
      db.appointment.count({
        where: { startAt: { gte: todayStart }, status: { not: 'cancelled' } },
      }),
      db.appointment.count({
        where: { startAt: { gte: weekStart }, status: { not: 'cancelled' } },
      }),
      db.organization.count({ where: { status: 'active' } }),
      db.organization.count({ where: { status: 'suspended' } }),
      db.appointment.count({
        where: { startAt: { gte: monthStart }, status: { not: 'cancelled' } },
      }),
      db.appointment.aggregate({
        where: { startAt: { gte: monthStart }, status: 'completed' },
        _sum:  { priceCop: true },
      }),
    ])

  return {
    todayCount,
    weekCount,
    activeCount,
    suspendedCount,
    monthCount,
    monthRevenueCop: monthRevenue._sum.priceCop ?? 0,
  }
}

/** Super-admin: adopción de branding (logo + color personalizado). */
export async function getBrandingAdoptionStats() {
  const [totalActive, withLogo, withCustomColor] = await Promise.all([
    db.organization.count({ where: { status: 'active' } }),
    db.branding.count({ where: { logoUrl: { not: null } } }),
    db.branding.count({ where: { primaryColor: { not: '#E0A300' } } }),
  ])
  return { totalActive, withLogo, withCustomColor }
}

/** Super-admin: volumen de citas + revenue por tenant en el mes actual. */
export async function getMonthlyTrafficByOrg() {
  const now        = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  return db.appointment.groupBy({
    by:     ['organizationId'],
    where:  { startAt: { gte: monthStart }, status: { not: 'cancelled' } },
    _count: { _all: true },
    _sum:   { priceCop: true },
    orderBy: { _count: { organizationId: 'desc' } },
  })
}

export type MonthlyTrafficRow = Awaited<ReturnType<typeof getMonthlyTrafficByOrg>>[number]

/** Super-admin: funnel de onboarding (5 pasos de activación). */
export async function getOnboardingFunnel() {
  const [total, withProfile, withBarber, withService, withOnlineAppointment] =
    await Promise.all([
      db.organization.count({ where: { status: 'active' } }),
      db.organization.count({
        where: { status: 'active', phone: { not: null }, city: { not: null } },
      }),
      db.organization.count({
        where: { status: 'active', barbers: { some: { active: true } } },
      }),
      db.organization.count({
        where: { status: 'active', services: { some: { active: true } } },
      }),
      db.organization.count({
        where: { status: 'active', appointments: { some: { source: 'online' } } },
      }),
    ])

  return { total, withProfile, withBarber, withService, withOnlineAppointment }
}
