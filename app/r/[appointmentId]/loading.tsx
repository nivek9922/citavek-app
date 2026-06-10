export default function ReviewLoading() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
      <div className="flex justify-center gap-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="h-6 w-6 rounded bg-muted" />
        ))}
      </div>
      <div className="h-20 rounded-lg bg-muted" />
      <div className="h-10 rounded-lg bg-muted" />
    </div>
  )
}
