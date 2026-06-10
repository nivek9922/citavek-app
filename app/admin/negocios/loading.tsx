export default function NegociosLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted/30" />
      </div>
      <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-card px-5 py-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-4 w-10 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-10 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  )
}
