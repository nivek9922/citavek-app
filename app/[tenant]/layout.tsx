import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { getTenantContext } from '@/server/tenant'
import { hexToOklch } from '@/shared/color-utils'
import { buildCloudinaryIconUrl } from '@/shared/cloudinary-url'
import { db } from '@/server/db'

// Pre-genera el shell PPR para todos los tenants activos conocidos en build time.
// Los tenants nuevos también funcionan (dynamicParams = true por defecto).
// A ~100 tenants el overhead de build es <10s; revisar si supera 500.
export async function generateStaticParams() {
  const orgs = await db.organization.findMany({
    where:   { status: 'active' },
    select:  { slug: true },
  })
  return orgs.map((o) => ({ tenant: o.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>
}): Promise<Metadata> {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const color = ctx.branding.primaryColor

  // iOS Safari NO lee el manifiesto para el icono de inicio: exige un
  // apple-touch-icon explícito (180x180, opaco). Si hay logo lo transformamos
  // en Cloudinary; si no, recurrimos al avatar generado en /[tenant]/icon.
  const appleIcon = (ctx.branding.logoUrl && buildCloudinaryIconUrl(ctx.branding.logoUrl, 180, color))
    ?? `/${slug}/icon?size=180`

  return {
    title: `${ctx.name} — Reserva tu cita`,
    description: ctx.branding.tagline ?? `Agenda tu cita en ${ctx.name}.`,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: [{ url: `/${slug}/icon?size=192`, sizes: '192x192', type: 'image/png' }],
      apple: [{ url: appleIcon, sizes: '180x180' }],
    },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: ctx.name },
  }
}

// theme-color va en el viewport (no en metadata) desde Next 14; generateViewport
// también recibe params, así que se lee el tenant igual que en generateMetadata.
// Comparten la query gracias al cache() de React en getTenantContext.
export async function generateViewport({
  params,
}: {
  params: Promise<{ tenant: string }>
}): Promise<Viewport> {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  return { themeColor: ctx.branding.primaryColor }
}

// El layout NO es async: el shell (children) es estático y se renderiza de
// inmediato. El tema del tenant depende del slug (dato dinámico de la URL), así
// que se inyecta en streaming dentro de <Suspense> como un <style> que
// sobreescribe las CSS vars en :root.
export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  return (
    <>
      <Suspense fallback={null}>
        <TenantTheme params={params} />
      </Suspense>
      {children}
    </>
  )
}

async function TenantTheme({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const { primary, glow } = hexToOklch(ctx.branding.primaryColor)
  const ring = primary.replace(')', ' / 60%)')

  // Valores derivados de un hex validado (no texto libre del usuario) → seguro interpolar.
  const css = `:root{--primary:${primary};--primary-glow:${glow};--ring:${ring};--sidebar-primary:${primary};}`
  return <style>{css}</style>
}
