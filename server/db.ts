import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { env } from '@/config/env'

function createClient() {
  // Prisma 7: el adapter recibe un pg.PoolConfig (o connectionString). En Vercel
  // serverless cada instancia abre su propio pool, así que conviene un pool chico
  // y resiliente — el pooler de Neon (DATABASE_URL con `-pooler`) es lo que de
  // verdad multiplexa hacia Postgres.
  //
  // `max` NO se baja de ~10: varias lecturas disparan Promise.all con fan-out
  // alto (p. ej. getOrgStats ~16 queries, la página del panel 6). Un pool más
  // chico serializaría esas queries paralelas y empeoraría la latencia.
  const adapter = new PrismaPg({
    connectionString:        env.DATABASE_URL,
    max:                     10,
    idleTimeoutMillis:       10_000, // suelta conexiones ociosas entre invocaciones
    connectionTimeoutMillis: 5_000,  // falla rápido si el pooler no responde
  })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
