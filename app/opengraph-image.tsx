import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { ImageResponse } from 'next/og'

// OG image global de Citavek para las rutas no-tenant (/, /login, /registro …).
// El OG por tenant vive en app/[tenant]/opengraph-image.tsx; este cubre la marca
// global y evita que al compartir el link (sobre todo por WhatsApp) salga un
// preview genérico. Se genera al vuelo con ImageResponse a partir del logo real
// de marca (app/_brand/citavek-logo.png, ya recortado a icono + wordmark y con el
// fondo en transparente para que asiente sin costura sobre el warm-black).

export const alt = 'Citavek — Reservas online para barberías'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Colores de marca (en hex para el renderer de OG).
const BRAND = '#E0A300' // --primary (ámbar)
const BG = '#161412' // warm-black del storefront/landing
const FG = '#F3EFE9' // warm off-white

export default async function OgImage() {
  // El logo se embebe como data-URI. El literal `new URL(..., import.meta.url)` hace
  // que el file-tracer de Next incluya el binario en el bundle de producción; se lee
  // con fs (fetch de file:// no está soportado en el runtime Node de Next).
  const logoData = await readFile(
    fileURLToPath(new URL('./_brand/citavek-logo.png', import.meta.url)),
  )
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          background: BG,
          position: 'relative',
        }}
      >
        {/* Accent bar superior con el color de marca */}
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

        {/* Logo real de marca (icono + wordmark CITAVEK) */}
        <img src={logoSrc} width={474} height={320} alt="Citavek" />

        {/* Tagline de producto */}
        <div
          style={{
            color: FG,
            fontSize: 46,
            fontWeight: 500,
            letterSpacing: '-0.5px',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Reservas online para barberías
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
