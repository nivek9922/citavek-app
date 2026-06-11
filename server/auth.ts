import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { db } from '@/server/db'
import { env } from '@/config/env'

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,

  // Explícito aunque coincida con baseURL: cuando haya subdominios por tenant
  // o dominio de marketing, se declaran aquí (no desactivar el check de Origin).
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],

  database: prismaAdapter(db, { provider: 'postgresql' }),

  emailAndPassword: { enabled: true },

  // Frena fuerza bruta en /api/auth/* (el rate limiter de los Server Actions
  // no cubre estos endpoints). Storage en memoria por defecto: al desplegar
  // multi-instancia (Vercel), mover a secondaryStorage con Redis/KV.
  rateLimit: {
    enabled: true,
    window:  60,
    max:     30,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      slugify: (name: string) =>
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 60),
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})

export type Session = typeof auth.$Infer.Session
export type User    = typeof auth.$Infer.Session['user']
