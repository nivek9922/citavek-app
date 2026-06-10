import { ImageResponse } from 'next/og'
import { getTenantContext } from '@/server/tenant'

// Icono PWA de fallback para tenants sin logoUrl: un avatar con la inicial del
// negocio sobre su color de marca. Se genera al vuelo (sin binarios) y la CDN lo
// cachea con las mismas cabeceras que el manifiesto.

const ALLOWED_SIZES = [180, 192, 512] as const
const DEFAULT_SIZE = 512

function parseSize(raw: string | null): number {
  const n = Number(raw)
  return (ALLOWED_SIZES as readonly number[]).includes(n) ? n : DEFAULT_SIZE
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug) // notFound() → 404 si no existe/suspendido

  const size = parseSize(new URL(req.url).searchParams.get('size'))
  const letter = ctx.name.trim().charAt(0).toUpperCase() || '?'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ctx.branding.primaryColor,
          color: '#ffffff',
          fontSize: Math.round(size * 0.52),
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        {letter}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
