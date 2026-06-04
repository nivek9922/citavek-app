import { NextResponse } from 'next/server'

export function proxy() {
  // Fase futura: reescritura de subdominio → /[slug]/...
  // const host = request.headers.get('host') ?? ''
  // const sub = resolveSubdomain(host)
  // if (sub) return NextResponse.rewrite(new URL(`/${sub}${request.nextUrl.pathname}`, request.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Excluir assets estáticos, _next y archivos con extensión
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
}
