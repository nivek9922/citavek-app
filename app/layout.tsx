import type { Metadata } from 'next'
import { Analytics }     from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BookingFlow — Software para barberías',
  description: 'Reservas online y gestión para barberías en Colombia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        {children}
        {/* Vercel Analytics: pageviews, eventos y Core Web Vitals.
            Solo activos en producción en Vercel; no-op en local. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
