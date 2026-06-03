import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { db } from '@/server/db'
import { permissions, type Permission } from '@/server/rbac'

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
