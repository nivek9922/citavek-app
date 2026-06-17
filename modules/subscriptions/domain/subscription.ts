// Dominio puro — sin dependencias de framework, Prisma ni React.
// Fuente única de verdad del acceso por suscripción: `canOperate` decide si una
// organización puede recibir/crear citas. Lo consumen el guard, la página pública,
// el banner del panel y los use cases.

export type PlanType = 'basic' | 'pro'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'suspended'
  | 'cancelled'

/** Días del período de gracia tras vencer un pago o un trial (estrategia Netflix). */
export const GRACE_PERIOD_DAYS = 5

/** Umbral para avisar "tu prueba está por vencer" en el panel. */
export const TRIAL_ENDING_SOON_DAYS = 7

/** Duración por defecto del período de prueba de una barbería nueva. */
export const TRIAL_DEFAULT_DAYS = 30

const DAY_MS = 86_400_000

/** Subconjunto de la suscripción necesario para decidir acceso y banner. */
export interface SubscriptionSnapshot {
  status:           SubscriptionStatus
  trialEndsAt:      Date | null
  currentPeriodEnd: Date | null
  graceStartedAt:   Date | null
}

function graceEndsAt(graceStartedAt: Date): Date {
  return new Date(graceStartedAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS)
}

/** Días restantes (hacia arriba) hasta `until`; nunca negativo. */
function daysUntil(until: Date, now: Date): number {
  return Math.max(0, Math.ceil((until.getTime() - now.getTime()) / DAY_MS))
}

/**
 * ¿Puede esta organización recibir/crear citas?
 *
 * - `null` (sin suscripción) → true (fail-open: tras el backfill ninguna org debería
 *   quedar sin suscripción; si por un bug faltara, no rompemos la reserva).
 * - `active` → siempre opera.
 * - `trial` → opera mientras el trial no haya vencido (robusto ante retraso del cron).
 * - `grace` → opera dentro de los GRACE_PERIOD_DAYS desde `graceStartedAt`.
 * - `suspended` / `cancelled` → no opera.
 */
export function canOperate(sub: SubscriptionSnapshot | null, now: Date): boolean {
  if (!sub) return true

  switch (sub.status) {
    case 'active':
      return true
    case 'trial':
      return sub.trialEndsAt === null || sub.trialEndsAt > now
    case 'grace':
      return sub.graceStartedAt === null || now < graceEndsAt(sub.graceStartedAt)
    case 'suspended':
    case 'cancelled':
      return false
  }
}

export type SubscriptionBanner =
  | { level: 'suspended' }
  | { level: 'grace';       daysLeft: number; until: Date }
  | { level: 'trialEnding'; daysLeft: number; until: Date }
  | null

/**
 * Estado de banner a mostrar en el panel del owner según la suscripción.
 * `null` → todo normal, sin banner.
 */
export function deriveSubscriptionView(
  sub: SubscriptionSnapshot | null,
  now: Date,
): SubscriptionBanner {
  if (!sub) return null

  // Suspendida, cancelada, o trial/gracia vencidos que el cron aún no marcó.
  if (!canOperate(sub, now)) return { level: 'suspended' }

  if (sub.status === 'grace') {
    const until = sub.graceStartedAt ? graceEndsAt(sub.graceStartedAt) : now
    return { level: 'grace', daysLeft: daysUntil(until, now), until }
  }

  if (sub.status === 'trial' && sub.trialEndsAt) {
    const daysLeft = daysUntil(sub.trialEndsAt, now)
    if (daysLeft <= TRIAL_ENDING_SOON_DAYS) {
      return { level: 'trialEnding', daysLeft, until: sub.trialEndsAt }
    }
  }

  return null
}

/** Error de negocio: la org no puede crear citas por su estado de suscripción. */
export class SubscriptionInactiveError extends Error {
  constructor() {
    super('Este negocio no está recibiendo citas en este momento.')
    this.name = 'SubscriptionInactiveError'
  }
}
