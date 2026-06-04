'use client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, MessageCircle, CalendarPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatCop } from '@/shared/format'
import { buildWhatsAppLink, buildIcsDataUri } from '@/shared/booking-links'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  service:     ServiceDTO
  barber:      BarberDTO
  startAt:     Date
  priceCop:    number
  shopName:    string
  shopPhone:   string | null
  shopAddress: string | null
  onNew:       () => void
}

export function BookingSuccess({
  service, barber, startAt, priceCop, shopName, shopPhone, shopAddress, onNew,
}: Props) {
  const endAt     = new Date(startAt.getTime() + service.durationMin * 60_000)
  const whenLabel = format(startAt, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  const waLink = shopPhone
    ? buildWhatsAppLink(
        shopPhone,
        `Hola ${shopName} 👋, confirmo mi cita:\n• ${service.name}\n• Con ${barber.displayName}\n• ${whenLabel}`,
      )
    : null

  const icsUri = buildIcsDataUri({
    title:       `${service.name} — ${shopName}`,
    description: `Cita con ${barber.displayName}`,
    location:    shopAddress ?? shopName,
    start:       startAt,
    end:         endAt,
  })

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="h-9 w-9 text-primary" />
      </div>

      <div>
        <h3 className="font-display text-2xl tracking-wide">¡Cita confirmada!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Te esperamos el <strong className="text-foreground">{whenLabel}</strong> con{' '}
          {barber.displayName.split(' ')[0]}.
        </p>
      </div>

      <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">{service.name}</p>
        <p className="text-muted-foreground">{formatCop(priceCop)}</p>
      </div>

      {/* Acciones de confirmación */}
      <div className="w-full space-y-2">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-smooth hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Confirmar por WhatsApp
          </a>
        )}
        <a
          href={icsUri}
          download="cita.ics"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-smooth hover:border-primary/50 hover:text-primary"
        >
          <CalendarPlus className="h-4 w-4" />
          Agregar al calendario
        </a>
      </div>

      <Button variant="ghost" onClick={onNew} className="w-full text-muted-foreground">
        Reservar otra cita
      </Button>
    </div>
  )
}
