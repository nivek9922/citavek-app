import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { db } from '@/server/db'
import { env } from '@/config/env'

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,

  database: prismaAdapter(db, { provider: 'postgresql' }),

  emailAndPassword: { enabled: true },

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
