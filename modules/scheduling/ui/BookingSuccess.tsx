'use client'
import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { CalendarPlus, CheckCircle2, Copy, Link, MessageCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatCop } from '@/shared/format'
import { buildWhatsAppLink, buildIcsDataUri } from '@/shared/booking-links'
import { isAnyBarber } from '@/modules/scheduling/domain/any-barber'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  service:       ServiceDTO
  barber:        BarberDTO
  startAt:       Date
  priceCop:      number
  appointmentId: string
  shopName:      string
  shopPhone:     string | null
  shopAddress:   string | null
  timezone:      string
  onNew:         () => void
}

export function BookingSuccess({
  service, barber, startAt, priceCop, appointmentId, shopName, shopPhone, shopAddress, timezone, onNew,
}: Props) {
  const [copied, setCopied] = useState(false)
  const citaUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cita/${appointmentId}`

  function handleCopy() {
    navigator.clipboard.writeText(citaUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const endAt     = new Date(startAt.getTime() + service.durationMin * 60_000)
  const whenLabel = formatInTimeZone(startAt, timezone, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  const barberLabel = isAnyBarber(barber.id) ? 'el primer barbero disponible' : barber.displayName
  const barberFirst = isAnyBarber(barber.id) ? 'tu barbero asignado' : barber.displayName.split(' ')[0]

  const waLink = shopPhone
    ? buildWhatsAppLink(
        shopPhone,
        `Hola ${shopName} 👋, confirmo mi cita:\n• ${service.name}\n• Con ${barberLabel}\n• ${whenLabel}`,
      )
    : null

  const icsUri = buildIcsDataUri({
    title:       `${service.name} — ${shopName}`,
    description: `Cita con ${barberLabel}`,
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
          {barberFirst}.
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

      {/* Link de la cita — para ver / cancelar sin cuenta */}
      <div className="w-full rounded-xl border border-border bg-muted/40 p-3 text-left">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link className="h-3.5 w-3.5" />
          Guarda este link para ver o cancelar tu cita
        </p>
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-xs text-foreground">
            {citaUrl}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Copiar link"
          >
            {copied
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <Copy className="h-4 w-4" />
            }
          </button>
        </div>
      </div>

      <Button variant="ghost" onClick={onNew} className="w-full text-muted-foreground">
        Reservar otra cita
      </Button>
    </div>
  )
}
