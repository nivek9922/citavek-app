import type { Metadata } from 'next'
import { Analytics }     from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster }       from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookingflow.app'),
  title: 'BookingFlow — Software para barberías',
  description: 'Reservas online y gestión para barberías en Colombia.',
  // Desactiva la auto-detección de teléfonos de iOS/Brave móvil. Sin esto, el
  // navegador transforma el texto del teléfono en <a href="tel:"> antes de que
  // React hidrate, causando un hydration mismatch inevitable.
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        {children}
        {/* Vercel Analytics: pageviews, eventos y Core Web Vitals.
            Solo activos en producción en Vercel; no-op en local. */}
        <Toaster position="bottom-right" richColors closeButton />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
