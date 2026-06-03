'use client'

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        No pudimos cargar la página de esta barbería. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
