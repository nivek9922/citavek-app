'use client'

export default function ReviewError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
      <p className="text-lg font-semibold">Algo salió mal</p>
      <p className="text-sm text-muted-foreground">
        No pudimos cargar la página de reseña. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
