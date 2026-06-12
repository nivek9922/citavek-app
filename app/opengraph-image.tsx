import { ImageResponse } from 'next/og'

// OG image global de Citavek para las rutas no-tenant (/, /login, /registro …).
// El OG por tenant vive en app/[tenant]/opengraph-image.tsx; este cubre la marca
// global y evita que al compartir el link salga el preview por defecto de Vercel.
// Se genera al vuelo con ImageResponse (sin binarios), misma estética que el OG
// por tenant: fondo oscuro + accent bar con el color de marca.

export const alt = 'Citavek — Reservas y gestión para barberías'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Color primario de marca (equivalente al --primary del tema, en hex para OG).
const BRAND = '#E0A300'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
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
            background: BRAND,
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            color: '#ffffff',
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          Citavek
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 20,
            color: '#a3a3a3',
            fontSize: 36,
            fontWeight: 400,
          }}
        >
          Reservas y gestión para barberías
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              background: BRAND,
              color: '#000000',
              fontSize: 24,
              fontWeight: 700,
              padding: '14px 34px',
              borderRadius: 12,
            }}
          >
            Reserva en línea
          </div>
          <div style={{ color: '#666666', fontSize: 22 }}>
            Sin filas · Sin llamadas
          </div>
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
