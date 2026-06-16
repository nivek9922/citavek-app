import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:        z.string().min(1),
  // Conexión directa sin pooler. La usa SOLO el build (`db:deploy` → prisma
  // migrate deploy), no el runtime → opcional para no romper `next start`/local
  // donde no haga falta. En Vercel debe existir o el build falla.
  DIRECT_URL:          z.string().min(1).optional(),
  NODE_ENV:            z.enum(['development', 'test', 'production']).default('development'),
  BETTER_AUTH_SECRET:  z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  SUPER_ADMIN_EMAIL:   z.string().email(),
})
  // El secreto de desarrollo es público (está en el .env de ejemplo): si llega a
  // producción, cualquier sesión es falsificable. Mejor no arrancar.
  // Exclusiones: la fase de build (`next build` corre con NODE_ENV=production
  // también en local) y `next start` local (app URL en localhost) — el guard
  // apunta al deploy real con dominio público.
  .refine(
    (e) =>
      e.NODE_ENV !== 'production'
      || process.env.NEXT_PHASE === 'phase-production-build'
      || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.NEXT_PUBLIC_APP_URL)
      || !e.BETTER_AUTH_SECRET.startsWith('bookingflow_dev_secret'),
    { message: 'BETTER_AUTH_SECRET de desarrollo detectado en producción. Genera uno real: openssl rand -base64 32' },
  )

export const env = envSchema.parse(process.env)
