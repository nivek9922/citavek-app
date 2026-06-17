import { Scissors } from 'lucide-react'
import { AppointmentPortal } from './AppointmentPortal'

export const metadata = { title: 'Mi cita — Citavek' }

export default async function CitaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="storefront flex min-h-screen flex-col items-center justify-start bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-3 font-display text-3xl tracking-wide text-primary">Citavek</h1>
          <p className="mt-1 text-sm text-muted-foreground">Portal de tu cita</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sf-card sm:p-7">
          <AppointmentPortal appointmentId={id} />
        </div>
      </div>
    </div>
  )
}
