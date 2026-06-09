import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTenantContext } from '@/server/tenant'
import { hexToOklch } from '@/shared/color-utils'
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
  return {
    title: `${ctx.name} — Reserva tu cita`,
    description: ctx.branding.tagline ?? `Agenda tu cita en ${ctx.name}.`,
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
  const ctx = await getTenantContext(slug)
  const { primary, glow } = hexToOklch(ctx.branding.primaryColor)
  const ring = primary.replace(')', ' / 60%)')

  // Valores derivados de un hex validado (no texto libre del usuario) → seguro interpolar.
  const css = `:root{--primary:${primary};--primary-glow:${glow};--ring:${ring};--sidebar-primary:${primary};}`
  return <style>{css}</style>
}
