export default function CodigosLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-muted/30" />
      </div>
      <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted/40" />
        <div className="h-14 animate-pulse rounded-2xl bg-muted/30" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  )
}
