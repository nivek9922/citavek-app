import 'server-only'

// Logger estructurado para Vercel. Emite JSON a stdout/stderr, lo que permite:
// - Vercel Log Drains → Datadog, Logtail, Axiom, etc.
// - Búsqueda por campo en el dashboard de Vercel.
// - Reemplazar `console.error` ad-hoc con contexto de módulo.
//
// Para integrar un provider externo (Sentry, Datadog, etc.) solo se modifica
// este archivo — el resto del código no necesita cambios.

type Level = 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

function emit(level: Level, msg: string, ctx?: LogContext) {
  const payload = JSON.stringify({
    level,
    msg,
    ts:  new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...ctx,
  })
  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else console.log(payload)
}

const log = {
  info:  (msg: string, ctx?: LogContext) => emit('info',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit('warn',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),

  /** Registra una acción de auditoría sensible (admin, datos de pago, bajas). */
  audit: (action: string, ctx?: LogContext) => emit('info', `[AUDIT] ${action}`, ctx),
}

export default log
