import { NextResponse } from 'next/server'
import { db } from '@/server/db'

// Health check con sonda real de conectividad a la base de datos: un 200 garantiza
// que la app puede hablar con Postgres, no solo que el proceso está vivo. Los
// balanceadores deben sacar de rotación la instancia ante un 503.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'up', ts: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'down', ts: new Date().toISOString() },
      { status: 503 },
    )
  }
}
