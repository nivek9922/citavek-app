import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { env } from '@/config/env'

export async function requireSuperAdmin() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.email !== env.SUPER_ADMIN_EMAIL) redirect('/')
  return session
}

export function isSuperAdmin(email: string) {
  return email === env.SUPER_ADMIN_EMAIL
}
