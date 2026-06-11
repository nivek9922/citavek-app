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

export interface TenantContextWithStatus extends TenantContext {
  status: 'active' | 'suspended'
}

// Igual que fetchTenantData pero sin filtrar por status: 'active'.
// Comparte el mismo cacheTag → se invalida junto al resto cuando se cambia el estado del tenant.
async function fetchTenantDataPermissive(slug: string) {
  'use cache'
  cacheTag(`tenant:${slug}`)
  cacheLife('max')
  return db.organization.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      timezone: true,
      currency: true,
      status: true,
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

// Variante permisiva de getTenantContext: devuelve el contexto del tenant incluso si está
// suspendido. Retorna null solo si el tenant no existe (slug desconocido).
// Usar en layouts o páginas que necesiten renderizar un estado especial para orgs suspendidas.
export const getTenantContextPermissive = cache(
  async (slug: string): Promise<TenantContextWithStatus | null> => {
    const org = await fetchTenantDataPermissive(slug)
    if (!org) return null
    return {
      ...org,
      status: org.status as 'active' | 'suspended',
      branding: org.branding ?? {
        primaryColor: '#E0A300',
        logoUrl: null,
        tagline: null,
        coverUrl: null,
      },
    }
  },
)
