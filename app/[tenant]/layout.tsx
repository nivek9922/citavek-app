import type { Metadata } from 'next'
import { getTenantContext } from '@/server/tenant'
import { hexToOklch } from '@/shared/color-utils'

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

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const { primary, glow } = hexToOklch(ctx.branding.primaryColor)

  // Inyectar CSS vars del tenant inline en el servidor → sin flash de color.
  const style = {
    '--primary': primary,
    '--primary-glow': glow,
    '--ring': primary.replace(')', ' / 60%)'),
    '--sidebar-primary': primary,
  } as React.CSSProperties

  // Las vars se aplican en un div wrapper, no en <html>.
  // El root layout (app/layout.tsx) ya renderiza <html> y <body>.
  // Los tokens CSS custom properties heredan hacia abajo desde este div.
  return <div style={style} className="contents">{children}</div>
}
