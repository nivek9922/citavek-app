import { NextResponse } from 'next/server'

/**
 * Security headers globales (S-03 del assessment).
 *
 * CSP deliberadamente acotada a frame-ancestors: una política completa con
 * script-src requiere nonces por request (rompe el caching estático de PPR);
 * la integridad de scripts ya la cubre SRI en next.config. Endurecer script-src
 * queda como mejora futura.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options':         'DENY',
  'X-Content-Type-Options':  'nosniff',
  'Referrer-Policy':         'strict-origin-when-cross-origin',
  'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
}

const HSTS = 'max-age=63072000; includeSubDomains'

export function proxy() {
  // Fase futura: reescritura de subdominio → /[slug]/...
  // const host = request.headers.get('host') ?? ''
  // const sub = resolveSubdomain(host)
  // if (sub) return NextResponse.rewrite(new URL(`/${sub}${request.nextUrl.pathname}`, request.url))
  const response = NextResponse.next()

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value)
  }
  // HSTS solo tiene sentido sobre HTTPS; en dev (http://localhost) ensuciaría el navegador.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', HSTS)
  }

  return response
}

export const config = {
  matcher: [
    // Excluir assets estáticos, _next y archivos con extensión
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
