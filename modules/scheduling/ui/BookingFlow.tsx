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
  tenantSlug: string
  services:   ServiceDTO[]
  barbers:    BarberDTO[]
}

export function BookingFlow({ tenantSlug, services, barbers }: Props) {
  const flow = useBookingFlow()
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState<{ startAt: Date; priceCop: number } | null>(null)

  if (confirmed && flow.draft.service && flow.draft.barber) {
    return (
      <BookingSuccess
        service={flow.draft.service}
        barber={flow.draft.barber}
        startAt={confirmed.startAt}
        priceCop={confirmed.priceCop}
        onNew={() => { setConfirmed(null); flow.reset() }}
      />
    )
  }

  const handleConfirm = () => {
    const { service, barber, startAt, customerName, customerPhone } = flow.draft
    if (!service || !barber || !startAt) return

    startTransition(async () => {
      const res = await bookAppointmentAction(tenantSlug, {
        serviceId:     service.id,
        barberId:      barber.id,
        startAtISO:    startAt.toISOString(),
        durationMin:   service.durationMin,
        priceCop:      service.priceCop,
        customerName:  customerName.trim(),
        customerPhone: customerPhone,
      })
      if (res.ok) {
        setConfirmed({ startAt, priceCop: service.priceCop })
      } else {
        alert(res.error)
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
        <StepDateTime
          tenantSlug={tenantSlug}
          barber={flow.draft.barber}
          durationMin={flow.draft.service.durationMin}
          selectedAt={flow.draft.startAt}
          onSelect={flow.setStartAt}
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
        />
      )}
    </div>
  )
}
