import { NextResponse } from 'next/server'
import { updateTag } from 'next/cache'
import log from '@/server/logger'
import { runSubscriptionLifecycle } from '@/modules/subscriptions/application/run-subscription-lifecycle'
import { prismaSubscriptionsRepository } from '@/modules/subscriptions/infrastructure/prisma-subscriptions-repository'

// Vercel Cron: configura en vercel.json → { "crons": [{ "path": "/api/cron/check-subscriptions", "schedule": "0 14 * * *" }] }
// 14:00 UTC = 9:00 am en Colombia (UTC-5). El header Authorization: Bearer <CRON_SECRET>
// lo pone Vercel automáticamente en prod; CRON_SECRET debe existir en las env vars.

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now    = new Date()
  const result = await runSubscriptionLifecycle(prismaSubscriptionsRepository, now)

  // Invalida la caché por tenant de los afectados (banner público/panel) y la lista del admin.
  const affected = [...result.periodsToGrace, ...result.trialsToGrace, ...result.graceToSuspended]
  for (const slug of new Set(affected.map((a) => a.slug))) updateTag(`tenant:${slug}`)
  if (affected.length > 0) {
    updateTag('admin-orgs')
    log.audit('subscription.lifecycle_sweep', {
      periodsToGrace:   result.periodsToGrace.length,
      trialsToGrace:    result.trialsToGrace.length,
      graceToSuspended: result.graceToSuspended.length,
    })
  }

  return NextResponse.json({
    ts:               now.toISOString(),
    periodsToGrace:   result.periodsToGrace.map((a) => a.slug),
    trialsToGrace:    result.trialsToGrace.map((a) => a.slug),
    graceToSuspended: result.graceToSuspended.map((a) => a.slug),
  })
}
