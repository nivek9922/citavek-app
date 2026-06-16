'use server'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { requireSuperAdmin } from '@/server/super-admin'
import { db } from '@/server/db'
import log from '@/server/logger'
import { prismaSubscriptionsRepository as repo } from './infrastructure/prisma-subscriptions-repository'
import { activateSubscription, SubscriptionError } from './application/activate-subscription'
import { extendTrial } from './application/extend-trial'
import { suspendSubscription } from './application/suspend-subscription'
import { cancelSubscription } from './application/cancel-subscription'

type ActionResult = { ok: true } | { ok: false; error: string }

/** Invalida la lista del admin + el contexto público/panel del tenant tras una mutación. */
async function invalidateOrg(orgId: string) {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { slug: true } })
  updateTag('admin-orgs')
  if (org) updateTag(`tenant:${org.slug}`)
}

// ── Activar pago manual ───────────────────────────────────────────────────────

const activateSchema = z.object({
  amountCop:     z.number().int().positive(),
  paidAtISO:     z.string().datetime(),
  paymentMethod: z.enum(['efectivo', 'transferencia']),
})

export async function activateSubscriptionAction(
  orgId: string,
  input: z.infer<typeof activateSchema>,
): Promise<ActionResult> {
  const session = await requireSuperAdmin()
  try {
    const data = activateSchema.parse(input)
    await activateSubscription(repo, {
      organizationId: orgId,
      amountCop:      data.amountCop,
      paidAt:         new Date(data.paidAtISO),
      paymentMethod:  data.paymentMethod,
    })
    await invalidateOrg(orgId)
    log.audit('subscription.activated', { orgId, amountCop: data.amountCop, by: session.user.email })
    return { ok: true }
  } catch (err) {
    if (err instanceof SubscriptionError) return { ok: false, error: err.message }
    log.error('activateSubscriptionAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudo activar la suscripción.' }
  }
}

// ── Extender trial ─────────────────────────────────────────────────────────────

const extendSchema = z.object({ days: z.number().int().positive().max(365) })

export async function extendTrialAction(
  orgId: string,
  input: z.infer<typeof extendSchema>,
): Promise<ActionResult> {
  const session = await requireSuperAdmin()
  try {
    const { days } = extendSchema.parse(input)
    await extendTrial(repo, { organizationId: orgId, days })
    await invalidateOrg(orgId)
    log.audit('subscription.trial_extended', { orgId, days, by: session.user.email })
    return { ok: true }
  } catch (err) {
    if (err instanceof SubscriptionError) return { ok: false, error: err.message }
    log.error('extendTrialAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudo extender la prueba.' }
  }
}

// ── Suspender ──────────────────────────────────────────────────────────────────

export async function suspendSubscriptionAction(orgId: string): Promise<ActionResult> {
  const session = await requireSuperAdmin()
  try {
    await suspendSubscription(repo, orgId)
    await invalidateOrg(orgId)
    log.audit('subscription.suspended', { orgId, by: session.user.email })
    return { ok: true }
  } catch (err) {
    log.error('suspendSubscriptionAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudo suspender la suscripción.' }
  }
}

// ── Cancelar ───────────────────────────────────────────────────────────────────

const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() })

export async function cancelSubscriptionAction(
  orgId: string,
  input: z.infer<typeof cancelSchema>,
): Promise<ActionResult> {
  const session = await requireSuperAdmin()
  try {
    const { reason } = cancelSchema.parse(input)
    await cancelSubscription(repo, { organizationId: orgId, reason })
    await invalidateOrg(orgId)
    log.audit('subscription.cancelled', { orgId, by: session.user.email })
    return { ok: true }
  } catch (err) {
    log.error('cancelSubscriptionAction', { orgId, err: String(err) })
    return { ok: false, error: 'No se pudo cancelar la suscripción.' }
  }
}
