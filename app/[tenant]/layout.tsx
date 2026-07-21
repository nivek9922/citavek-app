import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTenantContextPermissive } from '@/server/tenant'
import { hexToOklch } from '@/shared/color-utils'
import { buildCloudinaryIconUrl } from '@/shared/cloudinary-url'
import { getVocabulary } from '@/shared/vocabulary'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>
}): Promise<Metadata> {
  const { tenant: slug } = await params
  const ctx = await getTenantContextPermissive(slug)
  if (!ctx) return { title: 'No encontrado' }

  const color = ctx.branding.primaryColor

  // iOS Safari NO lee el manifiesto para el icono de inicio: exige un
  // apple-touch-icon explícito (180x180, opaco). Si hay logo lo transformamos
  // en Cloudinary; si no, recurrimos al avatar generado en /[tenant]/icon.
  const appleIcon = (ctx.branding.logoUrl && buildCloudinaryIconUrl(ctx.branding.logoUrl, 180, color))
    ?? `/${slug}/icon?size=180`

  const v = getVocabulary(ctx.businessType)
  const ogTitle = `${ctx.name} — Reserva tu cita en línea`
  const ogDescription = `Agenda tu cita en ${ctx.name} fácil y rápido. Elige servicio, ${v.professionalSingularLower} y horario en segundos. Sin llamadas, sin filas.`

  return {
    title: `${ctx.name} — Reserva tu cita`,
    description: ctx.branding.tagline ?? `Agenda tu cita en ${ctx.name}.`,
    manifest: `/${slug}/manifest.webmanifest`,
    icons: {
      icon: [{ url: `/${slug}/icon?size=192`, sizes: '192x192', type: 'image/png' }],
      apple: [{ url: appleIcon, sizes: '180x180' }],
    },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: ctx.name },
    openGraph: {
      type: 'website',
      title: ogTitle,
      description: ogDescription,
      siteName: 'Citavek',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: `Agenda tu cita en ${ctx.name} fácil y rápido. Sin llamadas, sin filas.`,
    },
  }
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
  const ctx = await getTenantContextPermissive(slug)
  const { primary, glow } = hexToOklch(ctx?.branding.primaryColor ?? '#E0A300')
  const ring = primary.replace(')', ' / 60%)')

  // Valores derivados de un hex validado (no texto libre del usuario) → seguro interpolar.
  const css = `:root{--primary:${primary};--primary-glow:${glow};--ring:${ring};--sidebar-primary:${primary};}`
  return <style>{css}</style>
}
