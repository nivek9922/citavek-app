import 'server-only'

// ── Rate limiter con auto-detección de backend ────────────────────────────────
//
// Si las variables VERCEL_KV (Vercel KV / Upstash) están configuradas, usa
// Redis distribuido — correcto para Vercel (multi-instancia, serverless).
// Si no, cae en un Map en memoria — válido para desarrollo local y deployments
// de un solo proceso (Railway, Fly.io con sticky routing).
//
// Para activar Vercel KV:
//   1. Panel Vercel → Storage → Create KV database → Connect to project
//   2. Las variables KV_REST_API_URL y KV_REST_API_TOKEN se añaden automáticamente.
//   No hay cambios de código necesarios.
//
// Para Upstash directo (sin Vercel): añade UPSTASH_REDIS_REST_URL e
// UPSTASH_REDIS_REST_TOKEN en .env — @vercel/kv los reconoce también.

// ── Interfaz común ────────────────────────────────────────────────────────────

interface RateLimitBackend {
  check(key: string, limit: number, windowMs: number): Promise<boolean>
}

// ── Backend: Vercel KV (Redis distribuido) ────────────────────────────────────

function buildKvBackend(): RateLimitBackend | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  if (!url) return null

  // Import lazy para no fallar si el paquete no está disponible en dev sin KV.
  return {
    async check(key: string, limit: number, windowMs: number): Promise<boolean> {
      const { kv } = await import('@vercel/kv')
      const windowSec = Math.ceil(windowMs / 1000)
      // INCR atómico + EXPIRE en una sola pipeline.
      const [[, count]] = await kv.pipeline()
        .incr(key)
        .expire(key, windowSec, 'NX') // solo setea TTL si la key es nueva
        .exec() as [[null, number], [null, number]]
      return count <= limit
    },
  }
}

// ── Backend: in-memory (fallback dev / single-process) ────────────────────────

interface Bucket { count: number; resetAt: number }
const store    = new Map<string, Bucket>()
let lastSweep  = Date.now()

const memoryBackend: RateLimitBackend = {
  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    if (now - lastSweep > 60_000) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k)
      lastSweep = now
    }
    const bucket = store.get(key)
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    if (bucket.count >= limit) return false
    bucket.count++
    return true
  },
}

// ── API pública ───────────────────────────────────────────────────────────────

let _backend: RateLimitBackend | null | undefined = undefined

function getBackend(): RateLimitBackend {
  if (_backend === undefined) _backend = buildKvBackend()
  return _backend ?? memoryBackend
}

/**
 * Verifica si la petición con `key` está dentro del límite.
 * @returns `true` si está permitida, `false` si excede.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    return await getBackend().check(key, limit, windowMs)
  } catch {
    // Si el backend Redis falla (red, config) → falla abierto para no bloquear
    // peticiones legítimas. Loggear en producción es suficiente.
    return true
  }
}

/** Mejor estimación de la IP del cliente a partir de las cabeceras del proxy. */
export function clientIpFrom(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? h.get('x-real-ip')
    ?? 'unknown'
}
