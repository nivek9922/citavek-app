export default function PanelLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/60 px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
