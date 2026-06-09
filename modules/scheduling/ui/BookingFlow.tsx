'use client'
import { useTransition, useState } from 'react'
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
  const [error, setError] = useState('')

  if (confirmed && flow.draft.service && flow.draft.barber) {
    return (
      <BookingSuccess
        service={flow.draft.service}
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
    const { service, barber, startAt, customerName, customerPhone } = flow.draft
    if (!service || !barber || !startAt) return

    setError('')
    startTransition(async () => {
      // Nota: precio y duración los deriva el servidor desde el serviceId.
      const res = await bookAppointmentAction(tenantSlug, {
        serviceId:     service.id,
        barberId:      barber.id,
        startAtISO:    startAt.toISOString(),
        customerName:  customerName.trim(),
        customerPhone: customerPhone,
      })
      if (res.ok) {
        setConfirmed({ startAt, priceCop: service.priceCop, appointmentId: res.appointmentId })
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="space-y-5">
      <BookingProgress step={flow.step} />

      {flow.step > 1 && (
        <Button variant="ghost" size="sm" onClick={flow.back} className="-ml-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Button>
      )}

      {flow.step === 1 && (
        <StepService
          services={services}
          selectedId={flow.draft.service?.id}
          onSelect={flow.setService}
        />
      )}

      {flow.step === 2 && (
        <StepBarber
          barbers={barbers}
          selectedId={flow.draft.barber?.id}
          onSelect={flow.setBarber}
        />
      )}

      {flow.step === 3 && flow.draft.barber && flow.draft.service && (
        // key = barbero + servicio → React resetea el componente automáticamente
        // cuando cambia cualquiera de los dos. Patrón correcto para evitar setState en effect.
        <StepDateTime
          key={`${flow.draft.barber.id}-${flow.draft.service.id}`}
          tenantSlug={tenantSlug}
          barber={flow.draft.barber}
          serviceId={flow.draft.service.id}
          durationMin={flow.draft.service.durationMin}
          selectedAt={flow.draft.startAt}
          onSelect={flow.setStartAt}
          timezone={timezone}
        />
      )}

      {flow.step === 4 && flow.draft.service && flow.draft.barber && flow.draft.startAt && (
        <StepConfirm
          service={flow.draft.service}
          barber={flow.draft.barber}
          startAt={flow.draft.startAt}
          customerName={flow.draft.customerName}
          customerPhone={flow.draft.customerPhone}
          onCustomer={flow.setCustomer}
          onConfirm={handleConfirm}
          isPending={isPending}
          canConfirm={flow.canConfirm}
          error={error}
        />
      )}
    </div>
  )
}
