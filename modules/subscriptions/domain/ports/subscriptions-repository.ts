import type { PlanType, SubscriptionStatus } from '../subscription'

/** Suscripción completa tal como la lee/devuelve la capa de aplicación (sin tipos de Prisma). */
export interface SubscriptionRecord {
  organizationId:     string
  plan:               PlanType
  status:             SubscriptionStatus
  trialEndsAt:        Date | null
  currentPeriodStart: Date | null
  currentPeriodEnd:   Date | null
  graceStartedAt:     Date | null
  lastPaymentAt:      Date | null
  lastPaymentAmount:  number | null
  paymentMethod:      string | null
  cancelledAt:        Date | null
  cancelReason:       string | null
}

/** Datos de un pago manual confirmado por el Super Admin. */
export interface ActivatePaymentInput {
  organizationId: string
  amountCop:      number
  paidAt:         Date
  periodStart:    Date
  periodEnd:      Date
  paymentMethod:  string
}

/** Organización afectada por una transición del cron (para invalidar caché). */
export interface AffectedOrg {
  organizationId: string
  slug:           string
}

export interface SubscriptionsRepository {
  findByOrg(organizationId: string): Promise<SubscriptionRecord | null>

  /** Crea (o reactiva) una suscripción en trial. Idempotente vía upsert. */
  createTrial(organizationId: string, trialEndsAt: Date): Promise<void>

  /** Pago confirmado → status active + período + datos de pago; limpia graceStartedAt. */
  activate(input: ActivatePaymentInput): Promise<void>

  /** Suma días al trial → status trial con nuevo trialEndsAt; limpia graceStartedAt. */
  extendTrial(organizationId: string, newTrialEndsAt: Date): Promise<void>

  /** Suspende manualmente la suscripción. */
  suspend(organizationId: string): Promise<void>

  /** Cancela definitivamente con motivo. */
  cancel(organizationId: string, reason: string | null, cancelledAt: Date): Promise<void>

  // ── Cron sweep (transiciones diarias) ──────────────────────────────────────
  // Cada método selecciona los afectados (id+slug), aplica un updateMany y devuelve
  // la lista — sin loops ni N+1 — para que el route invalide la caché por tenant.

  /** active + currentPeriodEnd <= now → grace (graceStartedAt = now). */
  expireActivePeriods(now: Date): Promise<AffectedOrg[]>

  /** trial + trialEndsAt <= now → grace (graceStartedAt = now). */
  expireTrials(now: Date): Promise<AffectedOrg[]>

  /** grace + graceStartedAt <= cutoff → suspended. */
  suspendExpiredGrace(graceCutoff: Date): Promise<AffectedOrg[]>
}
