import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'

export async function requireSuperAdmin() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.email !== process.env.SUPER_ADMIN_EMAIL) redirect('/')
  return session
}

export function isSuperAdmin(email: string) {
  return email === process.env.SUPER_ADMIN_EMAIL
}
