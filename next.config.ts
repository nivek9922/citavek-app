import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Permite que el dev server acepte peticiones cross-origin desde la IP LAN del PC.
  // Sin esto, Next.js 15.1+ bloquea los chunks de Turbopack y el WebSocket HMR
  // cuando se accede desde otro dispositivo → JS no ejecuta, sin hidratación.
  // Solo aplica en modo dev; no tiene efecto en build/start.
  allowedDevOrigins: ['172.20.10.8'],
  images: {
    // Las URLs de avatar e imagen de servicio son proporcionadas por el usuario
    // y pueden provenir de cualquier dominio HTTPS. Se usa unoptimized en los
    // componentes para no pasar por el pipeline de optimización.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  // Evita que Turbopack bundlee estos paquetes — los usa directamente
  // desde node_modules. Necesario por conflictos internos de kysely en better-auth.
  serverExternalPackages: [
    'better-auth',
    '@better-auth/kysely-adapter',
    'kysely',
    '@prisma/adapter-pg',
  ],
  // Subresource Integrity: hashea los scripts en build y añade `integrity` a los
  // <script>, para que el navegador rechace assets manipulados en tránsito.
  // Habilita la directiva `"use cache"` y las funciones cacheTag/cacheLife.
  // Permite cachear lecturas de tenant/servicios/barberos con invalidación por tag
  // en lugar de revalidatePath, reduciendo SSR completo en el hot path de reservas.
  cacheComponents: true,
  experimental: {
    sri: {
      algorithm: 'sha256',
    },
  },
}

export default nextConfig
