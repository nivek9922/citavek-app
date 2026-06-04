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

/** Super-admin: todas las barberías. NO tenant-scoped (intencional). */
export async function listOrganizationsForAdmin() {
  return db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, slug: true, city: true, status: true,
      branding: { select: { primaryColor: true } },
      _count:   { select: { barbers: true, appointments: true } },
    },
  })
}
