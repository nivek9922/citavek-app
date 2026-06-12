import { ImageResponse } from 'next/og'
import { getTenantContext } from '@/server/tenant'

export const alt = 'Reserva tu cita en línea'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)

  const { name, city, branding } = ctx
  const { primaryColor, logoUrl, tagline } = branding
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  const subtitle = tagline ?? (city ? city : 'Agenda tu cita fácil y rápido')

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1c1c1c 100%)',
          padding: '64px 72px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Accent bar superior con color de marca */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: primaryColor,
          }}
        />

        {/* Logo o inicial */}
        {logoUrl ? (
          <img
            src={logoUrl}
            width={88}
            height={88}
            style={{ borderRadius: 16, objectFit: 'cover' }}
            alt={name}
          />
        ) : (
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 16,
              background: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 46,
              fontWeight: 700,
            }}
          >
            {letter}
          </div>
        )}

        {/* Nombre del negocio */}
        <div
          style={{
            marginTop: 28,
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-1px',
          }}
        >
          {name}
        </div>

        {/* Tagline / ciudad */}
        <div
          style={{
            marginTop: 14,
            color: '#909090',
            fontSize: 28,
            fontWeight: 400,
          }}
        >
          {subtitle}
        </div>

        {/* CTA y claim — pegados al fondo */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              background: primaryColor,
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 700,
              padding: '14px 32px',
              borderRadius: 12,
            }}
          >
            Reserva tu cita en línea
          </div>
          <div style={{ color: '#666666', fontSize: 20 }}>
            Sin filas · Sin llamadas
          </div>
        </div>

        {/* Branding Citavek */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            right: 72,
            color: '#3a3a3a',
            fontSize: 17,
          }}
        >
          Powered by Citavek
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
