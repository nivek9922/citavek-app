import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { cacheTag, cacheLife } from 'next/cache'
import { db } from '@/server/db'

export interface TenantContext {
  id: string
  slug: string
  name: string
  city: string | null
  address: string | null
  phone: string | null
  timezone: string
  currency: string
  branding: {
    primaryColor: string
    logoUrl: string | null
    tagline: string | null
    coverUrl: string | null
  }
}

// Capa persistente: datos del tenant cacheados hasta que `tenant:${slug}` se invalide.
// notFound() vive FUERA de este scope para no cachear el estado "no encontrado".
async function fetchTenantData(slug: string) {
  'use cache'
  cacheTag(`tenant:${slug}`)
  cacheLife('max')
  return db.organization.findFirst({
    where: { slug, status: 'active' },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      address: true,
      phone: true,
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
}

// Capa de request: React cache() deduplicates within a single request.
// Llama a fetchTenantData (persistente) y dispara notFound() si el tenant no existe.
export const getTenantContext = cache(async (slug: string): Promise<TenantContext> => {
  const org = await fetchTenantData(slug)

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
