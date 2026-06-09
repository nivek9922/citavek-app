import { Scissors } from 'lucide-react'

export default function CitaLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-wide text-primary">BookingFlow</h1>
          <p className="mt-1 text-sm text-muted-foreground">Portal de tu cita</p>
        </div>
        <div className="h-48 rounded-2xl border border-border bg-card/60 animate-pulse" />
      </div>
    </div>
  )
}
