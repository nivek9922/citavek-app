import 'server-only'
import { db } from '@/server/db'
import { computeHealthScore } from './domain/health-score'

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
  const since = new Date(Date.now() - HEALTH_WINDOW_DAYS * 86_400_000)

  // 3 queries en paralelo para N tenants (sin N+1): lista + 2 agregados.
  const [orgs, created, cancelled] = await Promise.all([
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
      where:  { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by:     ['organizationId'],
      where:  { cancelledAt: { gte: since } },
      _count: { _all: true },
    }),
  ])

  const createdBy   = new Map(created.map((r) => [r.organizationId, r._count._all]))
  const cancelledBy = new Map(cancelled.map((r) => [r.organizationId, r._count._all]))

  return orgs.map((org) => ({
    ...org,
    health: computeHealthScore(
      createdBy.get(org.id) ?? 0,
      cancelledBy.get(org.id) ?? 0,
      Math.floor((Date.now() - org.createdAt.getTime()) / 86_400_000),
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

  const [todayCount, weekCount, activeCount, suspendedCount] = await Promise.all([
    db.appointment.count({
      where: { startAt: { gte: todayStart }, status: { not: 'cancelled' } },
    }),
    db.appointment.count({
      where: { startAt: { gte: weekStart }, status: { not: 'cancelled' } },
    }),
    db.organization.count({ where: { status: 'active' } }),
    db.organization.count({ where: { status: 'suspended' } }),
  ])

  return { todayCount, weekCount, activeCount, suspendedCount }
}
