import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:        z.string().min(1),
  NODE_ENV:            z.enum(['development', 'test', 'production']).default('development'),
  BETTER_AUTH_SECRET:  z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  SUPER_ADMIN_EMAIL:   z.string().email(),
})

export const env = envSchema.parse(process.env)
