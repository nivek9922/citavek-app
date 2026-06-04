import { Scissors } from 'lucide-react'
import { AppointmentPortal } from './AppointmentPortal'

export const metadata = { title: 'Mi cita — BookingFlow' }

export default async function CitaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <AppointmentPortal appointmentId={id} />
        </div>
      </div>
    </div>
  )
}
