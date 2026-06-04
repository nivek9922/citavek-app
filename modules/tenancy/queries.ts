import 'server-only'
import { db } from '@/server/db'

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

/** Super-admin: todas las barberías con última cita (para churn). NO tenant-scoped. */
export async function listOrganizationsForAdmin() {
  return db.organization.findMany({
    orderBy: { createdAt: 'desc' },
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
  })
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
