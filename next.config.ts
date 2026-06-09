import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  experimental: {
    sri: {
      algorithm: 'sha256',
    },
  },
}

export default nextConfig
