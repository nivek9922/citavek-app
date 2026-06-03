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
}

export default nextConfig
