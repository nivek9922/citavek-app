'use client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatCop } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  service:   ServiceDTO
  barber:    BarberDTO
  startAt:   Date
  priceCop:  number
  onNew:     () => void
}

export function BookingSuccess({ service, barber, startAt, priceCop, onNew }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-9 w-9 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-bold">¡Cita confirmada!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Te esperamos el{' '}
          <strong>{format(startAt, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}</strong>
          {' '}con {barber.displayName.split(' ')[0]}.
        </p>
      </div>
      <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">{service.name}</p>
        <p className="text-muted-foreground">{formatCop(priceCop)}</p>
      </div>
      <Button variant="outline" onClick={onNew} className="w-full">
        Reservar otra cita
      </Button>
    </div>
  )
}
