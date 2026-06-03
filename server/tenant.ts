import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { db } from '@/server/db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  timezone: string
  currency: string
  branding: {
    primaryColor: string
    logoUrl: string | null
    tagline: string | null
    coverUrl: string | null
  }
}

// Memoizado por request con cache() de React.
// Una sola query a DB por request, sin importar cuántos layouts/componentes lo llamen.
export const getTenantContext = cache(async (slug: string): Promise<TenantContext> => {
  const org = await db.organization.findFirst({
    where: { slug, status: 'active' },
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      currency: true,
      branding: {
        select: {
          primaryColor: true,
          logoUrl: true,
          tagline: true,
          coverUrl: true,
        },
      },
    },
  })

  if (!org) notFound()

  return {
    ...org,
    branding: org.branding ?? {
      primaryColor: '#E0A300',
      logoUrl: null,
      tagline: null,
      coverUrl: null,
    },
  }
})
