'use client'
import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useBookingFlow } from './useBookingFlow'
import { BookingProgress } from './BookingProgress'
import { StepService }    from './StepService'
import { StepBarber }     from './StepBarber'
import { StepDateTime }   from './StepDateTime'
import { StepConfirm }    from './StepConfirm'
import { BookingSuccess } from './BookingSuccess'
import { bookAppointmentAction } from '../actions'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  tenantSlug:  string
  services:    ServiceDTO[]
  barbers:     BarberDTO[]
  shopName:    string
  shopPhone:   string | null
  shopAddress: string | null
  timezone:    string
}

export function BookingFlow({ tenantSlug, services, barbers, shopName, shopPhone, shopAddress, timezone }: Props) {
  const flow = useBookingFlow()
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState<{ startAt: Date; priceCop: number; appointmentId: string } | null>(null)

  if (confirmed && flow.draft.services.length > 0 && flow.draft.barber) {
    return (
      <BookingSuccess
        services={flow.draft.services}
        totalDurationMin={flow.totalDurationMin}
        barber={flow.draft.barber}
        startAt={confirmed.startAt}
        priceCop={confirmed.priceCop}
        appointmentId={confirmed.appointmentId}
        shopName={shopName}
        shopPhone={shopPhone}
        shopAddress={shopAddress}
        timezone={timezone}
        onNew={() => { setConfirmed(null); flow.reset() }}
      />
    )
  }

  const handleConfirm = () => {
    const { services, barber, startAt, customerName, customerPhone } = flow.draft
    if (services.length === 0 || !barber || !startAt) return

    startTransition(async () => {
      // Nota: precio y duración TOTALES los deriva el servidor desde serviceIds.
      const res = await bookAppointmentAction(tenantSlug, {
        serviceIds:    services.map((s) => s.id),
        barberId:      barber.id,
        startAtISO:    startAt.toISOString(),
        customerName:  customerName.trim(),
        customerPhone: customerPhone,
      })
      if (res.ok) {
        // Precio autoritativo del servidor (ya incluye el descuento de lealtad si aplicó).
        setConfirmed({ startAt, priceCop: res.priceCop, appointmentId: res.appointmentId })
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      <BookingProgress step={flow.step} />

      {flow.step > 1 && (
        <Button variant="ghost" size="sm" onClick={flow.back} className="-ml-2 h-8 gap-1 px-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Button>
      )}

      {/* key={flow.step} → la transición suave se reproduce al cambiar de paso.
          motion-safe respeta prefers-reduced-motion. */}
      <div
        key={flow.step}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
      >
        {flow.step === 1 && (
          <StepService
            services={services}
            selectedIds={flow.draft.services.map((s) => s.id)}
            onToggle={flow.toggleService}
            totalPriceCop={flow.totalPriceCop}
            totalDurationMin={flow.totalDurationMin}
            onContinue={flow.goToBarber}
          />
        )}

        {flow.step === 2 && (
          <StepBarber
            barbers={barbers}
            selectedId={flow.draft.barber?.id}
            onSelect={flow.setBarber}
          />
        )}

        {flow.step === 3 && flow.draft.barber && flow.draft.services.length > 0 && (
          // key = barbero + servicios → React resetea el componente automáticamente
          // cuando cambia cualquiera. Patrón correcto para evitar setState en effect.
          <StepDateTime
            key={`${flow.draft.barber.id}-${flow.draft.services.map((s) => s.id).join(',')}`}
            tenantSlug={tenantSlug}
            barber={flow.draft.barber}
            services={flow.draft.services}
            totalDurationMin={flow.totalDurationMin}
            totalPriceCop={flow.totalPriceCop}
            selectedAt={flow.draft.startAt}
            onSelect={flow.setStartAt}
            timezone={timezone}
          />
        )}

        {flow.step === 4 && flow.draft.services.length > 0 && flow.draft.barber && flow.draft.startAt && (
          <StepConfirm
            tenantSlug={tenantSlug}
            services={flow.draft.services}
            totalPriceCop={flow.totalPriceCop}
            totalDurationMin={flow.totalDurationMin}
            barber={flow.draft.barber}
            startAt={flow.draft.startAt}
            customerName={flow.draft.customerName}
            customerPhone={flow.draft.customerPhone}
            onCustomer={flow.setCustomer}
            onConfirm={handleConfirm}
            isPending={isPending}
            canConfirm={flow.canConfirm}
          />
        )}
      </div>
    </div>
  )
}
