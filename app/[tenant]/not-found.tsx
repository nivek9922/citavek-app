import Link from 'next/link'
import { MapPinOff } from 'lucide-react'
import type { Metadata } from 'next'
import { Button } from '@/shared/ui/button'

// Con PPR el HTTP status es 200 (el shell se compromete antes del stream).
// noindex evita que los crawlers indexen slugs inexistentes como páginas reales.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function TenantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-muted/30 ring-1 ring-border">
        <MapPinOff className="h-14 w-14 text-muted-foreground/30" />
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide sm:text-5xl">
          Negocio no encontrado
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          El enlace parece ser incorrecto o la barbería ya no está disponible.
        </p>
      </div>

      <Button variant="outline" asChild>
        <Link href="/">← Volver al inicio</Link>
      </Button>
    </main>
  )
}
