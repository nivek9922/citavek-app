import { getTenantContext } from '@/server/tenant'
import { buildCloudinaryIconUrl } from '@/shared/cloudinary-url'

// Manifiesto PWA dinámico por tenant. Un convention-file `app/manifest.ts` de
// Next es único y global (no recibe params), así que el caso multi-tenant se
// resuelve con este Route Handler en un segmento dinámico.
//
// Caché: la CDN sirve la respuesta sin invocar la función ni tocar Postgres
// durante `s-maxage`. Las acciones de marca hacen revalidatePath de esta ruta
// para propagar los cambios al instante.

interface ManifestIcon {
  src: string
  sizes: string
  type: 'image/png'
  purpose?: 'any' | 'maskable'
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug) // notFound() → 404 si no existe/suspendido
  const { name, branding } = ctx
  const color = branding.primaryColor

  const iconSrc = (size: number): string => {
    const fromLogo = branding.logoUrl
      ? buildCloudinaryIconUrl(branding.logoUrl, size, color)
      : null
    return fromLogo ?? `/${slug}/icon?size=${size}`
  }

  const manifest = {
    id: `/${slug}`,
    scope: `/${slug}`,
    start_url: `/${slug}`,
    name: `${name} — Reservas`,
    short_name: name.slice(0, 12),
    description: branding.tagline ?? `Agenda tu cita en ${name}.`,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'es',
    background_color: '#0a0a0a', // splash oscuro, acorde al diseño dark-first
    theme_color: color,
    icons: [
      { src: iconSrc(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconSrc(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconSrc(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ] satisfies ManifestIcon[],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
