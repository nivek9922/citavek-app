import 'server-only'
import { db } from '@/server/db'
import type {
  SubscriptionsRepository,
  SubscriptionRecord,
  ActivatePaymentInput,
  AffectedOrg,
} from '../domain/ports/subscriptions-repository'

const RECORD_SELECT = {
  organizationId:     true,
  plan:               true,
  status:             true,
  trialEndsAt:        true,
  currentPeriodStart: true,
  currentPeriodEnd:   true,
  graceStartedAt:     true,
  lastPaymentAt:      true,
  lastPaymentAmount:  true,
  paymentMethod:      true,
  cancelledAt:        true,
  cancelReason:       true,
} as const

export const prismaSubscriptionsRepository: SubscriptionsRepository = {
  async findByOrg(organizationId): Promise<SubscriptionRecord | null> {
    return db.subscription.findUnique({
      where:  { organizationId },
      select: RECORD_SELECT,
    })
  },

  async createTrial(organizationId, trialEndsAt) {
    // Idempotente: si ya existe una suscripción, no la pisamos (update vacío).
    await db.subscription.upsert({
      where:  { organizationId },
      create: { organizationId, status: 'trial', trialEndsAt },
      update: {},
    })
  },

  async activate(input: ActivatePaymentInput) {
    const data = {
      status:             'active' as const,
      currentPeriodStart: input.periodStart,
      currentPeriodEnd:   input.periodEnd,
      lastPaymentAt:      input.paidAt,
      lastPaymentAmount:  input.amountCop,
      paymentMethod:      input.paymentMethod,
      graceStartedAt:     null,
      cancelledAt:        null,
      cancelReason:       null,
    }
    await db.subscription.upsert({
      where:  { organizationId: input.organizationId },
      create: { organizationId: input.organizationId, ...data },
      update: data,
    })
  },

  async extendTrial(organizationId, newTrialEndsAt) {
    await db.subscription.update({
      where: { organizationId },
      data:  { status: 'trial', trialEndsAt: newTrialEndsAt, graceStartedAt: null },
    })
  },

  async suspend(organizationId) {
    await db.subscription.update({
      where: { organizationId },
      data:  { status: 'suspended' },
    })
  },

  async cancel(organizationId, reason, cancelledAt) {
    await db.subscription.update({
      where: { organizationId },
      data:  { status: 'cancelled', cancelledAt, cancelReason: reason },
    })
  },

  // ── Cron sweep ───────────────────────────────────────────────────────────────

  async expireActivePeriods(now): Promise<AffectedOrg[]> {
    const affected = await selectAffected({ status: 'active', currentPeriodEnd: { lte: now } })
    if (affected.length === 0) return []
    await db.subscription.updateMany({
      where: { organizationId: { in: affected.map((a) => a.organizationId) }, status: 'active' },
      data:  { status: 'grace', graceStartedAt: now },
    })
    return affected
  },

  async expireTrials(now): Promise<AffectedOrg[]> {
    const affected = await selectAffected({ status: 'trial', trialEndsAt: { lte: now } })
    if (affected.length === 0) return []
    await db.subscription.updateMany({
      where: { organizationId: { in: affected.map((a) => a.organizationId) }, status: 'trial' },
      data:  { status: 'grace', graceStartedAt: now },
    })
    return affected
  },

  async suspendExpiredGrace(graceCutoff): Promise<AffectedOrg[]> {
    const affected = await selectAffected({ status: 'grace', graceStartedAt: { lte: graceCutoff } })
    if (affected.length === 0) return []
    await db.subscription.updateMany({
      where: { organizationId: { in: affected.map((a) => a.organizationId) }, status: 'grace' },
      data:  { status: 'suspended' },
    })
    return affected
  },
}

/** Selecciona los orgs (id + slug) que cumplen el filtro, para invalidar caché tras el updateMany. */
async function selectAffected(where: object): Promise<AffectedOrg[]> {
  const rows = await db.subscription.findMany({
    where,
    select: { organizationId: true, organization: { select: { slug: true } } },
  })
  return rows.map((r) => ({ organizationId: r.organizationId, slug: r.organization.slug }))
}
