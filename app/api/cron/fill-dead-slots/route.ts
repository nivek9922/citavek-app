import { NextResponse } from 'next/server'
import { db } from '@/server/db'
import { findDeadSlots } from '@/modules/scheduling/application/find-dead-slots'
import { findInactiveCustomers } from '@/modules/customers/queries'
import { prismaSchedulingRepository } from '@/modules/scheduling/infrastructure/prisma-scheduling-repository'

// Vercel Cron: configura en vercel.json → { "crons": [{ "path": "/api/cron/fill-dead-slots", "schedule": "0 8 * * *" }] }
// La variable CRON_SECRET debe estar en las variables de entorno del proyecto.
// El header Authorization: Bearer <CRON_SECRET> lo pone Vercel automáticamente en prod.

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgs = await db.organization.findMany({
    where:  { status: 'active' },
    select: { id: true, name: true, slug: true },
  })

  const results = await Promise.all(
    orgs.map(async (org) => {
      const [deadSlots, inactiveCustomers] = await Promise.all([
        findDeadSlots(prismaSchedulingRepository, org.id),
        findInactiveCustomers(org.id),
      ])
      return {
        orgSlug:  org.slug,
        orgName:  org.name,
        deadSlots: deadSlots.map((d) => ({
          date:         d.date,
          totalFreeMin: d.totalFreeMin,
          barberCount:  d.barbers.length,
        })),
        inactiveCount: inactiveCustomers.length,
      }
    }),
  )

  return NextResponse.json({
    ts:      new Date().toISOString(),
    orgCount: orgs.length,
    results,
  })
}
