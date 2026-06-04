import 'server-only'
import { db } from '@/server/db'

/** Primera membresía del usuario (para decidir el redirect post-login). */
export async function getPrimaryMembership(userId: string) {
  return db.member.findFirst({
    where:   { userId },
    orderBy: { createdAt: 'asc' },
    select:  { organization: { select: { slug: true, status: true } } },
  })
}
