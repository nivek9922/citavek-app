export default function TenantLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden py-20">
        <div className="mx-auto max-w-3xl space-y-4 px-5 text-center">
          <div className="mx-auto h-5 w-32 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto h-14 w-96 animate-pulse rounded-xl bg-muted" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      {/* Booking card skeleton */}
      <div className="mx-auto max-w-2xl px-4 pb-6">
        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
      </div>
    </div>
  )
}
