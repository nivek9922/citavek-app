import type { Metadata } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import { Analytics }     from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster }       from 'sonner'
import './globals.css'

// Tipografías de marca. La display (Bebas Neue) da el wordmark de "lujo
// minimalista"; Inter es el cuerpo. Se exponen como variables CSS que consume
// globals.css (--font-display / --font-sans).
const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const title = 'Citavek — Software para barberías'
const description = 'Reservas online y gestión para barberías en Colombia.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://citavek.app'),
  title,
  description,
  // openGraph/twitter globales para las rutas no-tenant: sin esto, al compartir
  // el link por WhatsApp salía el preview por defecto de Vercel. La imagen la
  // resuelve automáticamente app/opengraph-image.tsx.
  openGraph: {
    type: 'website',
    siteName: 'Citavek',
    title,
    description,
    url: '/',
    locale: 'es_CO',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  // Desactiva la auto-detección de teléfonos de iOS/Brave móvil. Sin esto, el
  // navegador transforma el texto del teléfono en <a href="tel:"> antes de que
  // React hidrate, causando un hydration mismatch inevitable.
  formatDetection: { telephone: false },
}

// Script anti-flash (FOUC): fija la clase `.dark` ANTES de pintar, leyendo la
// preferencia de localStorage. Default del producto = dark (solo 'light' la
// quita). Contenido 100% estático, sin input de usuario → no es riesgo XSS.
const themeScript = `(function(){try{var t=localStorage.getItem('citavek-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning className={`${bebas.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
