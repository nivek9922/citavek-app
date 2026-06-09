import type { Metadata } from 'next'

// Con PPR el HTTP status es 200 (el shell se compromete antes del stream).
// noindex evita que los crawlers indexen slugs inexistentes como páginas reales.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function TenantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">Esta barbería no existe o no está disponible.</p>
    </main>
  )
}
