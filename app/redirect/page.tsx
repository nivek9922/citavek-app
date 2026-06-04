import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { isSuperAdmin } from '@/server/super-admin'
import { getPrimaryMembership } from '@/modules/identity/queries'

// Después del login, decide a dónde va el usuario:
// super-admin → /admin | owner/barber → /[slug]/panel | sin org → /sin-barberia
export default async function RedirectPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (isSuperAdmin(session.user.email)) redirect('/admin')

  const member = await getPrimaryMembership(session.user.id)
  if (!member || member.organization.status !== 'active') redirect('/sin-barberia')

  redirect(`/${member.organization.slug}/panel`)
}
