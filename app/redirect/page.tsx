import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { isSuperAdmin } from '@/server/super-admin'
import { db } from '@/server/db'

// Después del login, decide a dónde va el usuario:
// super-admin → /admin | owner/barber → /[slug]/panel | sin org → /sin-barberia
export default async function RedirectPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (isSuperAdmin(session.user.email)) redirect('/admin')

  // Buscar la primera membresía activa del usuario
  const member = await db.member.findFirst({
    where: { userId: session.user.id },
    include: { organization: { select: { slug: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (!member || member.organization.status !== 'active') redirect('/sin-barberia')

  redirect(`/${member.organization.slug}/panel`)
}
