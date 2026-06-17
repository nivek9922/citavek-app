import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { db } from '@/server/db'
import { permissions, type Permission } from '@/server/rbac'
import { canOperate, SubscriptionInactiveError } from '@/modules/subscriptions/domain/subscription'

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireMembership(organizationId: string) {
  const session = await requireSession()
  const member = await db.member.findFirst({
    where: { organizationId, userId: session.user.id },
  })
  if (!member) redirect('/login')
  return { session, member }
}

export async function requirePermission(organizationId: string, permission: Permission) {
  const { session, member } = await requireMembership(organizationId)
  const allowed = permissions[permission] as string[]
  if (!allowed.includes(member.role)) throw new Error(`Forbidden: ${permission}`)
  return { session, member }
}

/**
 * Guard de NEGOCIO (no de control de flujo): bloquea la creación de citas si la
 * suscripción de la org no permite operar. Lee la suscripción directo (igual que
 * requireMembership lee db.member) y aplica el predicado puro `canOperate`.
 *
 * Va DENTRO del try del Server Action y se atrapa `SubscriptionInactiveError` para
 * devolver un mensaje limpio — a diferencia de requirePermission/getTenantContext,
 * que van fuera porque usan redirect()/notFound().
 */
export async function requireActiveSubscription(organizationId: string) {
  const sub = await db.subscription.findUnique({
    where:  { organizationId },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true, graceStartedAt: true },
  })
  if (!canOperate(sub, new Date())) throw new SubscriptionInactiveError()
}
