'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Clock, Phone, Scissors } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import {
  cancelByCustomerAction,
  getCustomerAppointmentAction,
} from '@/modules/scheduling/customer-actions'
import type { CustomerAppointment } from '@/modules/scheduling/domain/ports/scheduling-repository'

// ── Helpers de formato ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { text: 'Pendiente',  variant: 'secondary' },
  confirmed: { text: 'Confirmada', variant: 'default' },
  completed: { text: 'Completada', variant: 'outline' },
  cancelled: { text: 'Cancelada',  variant: 'destructive' },
  no_show:   { text: 'No asistió', variant: 'destructive' },
}

function fmtDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz,
  }).format(new Date(d))
}

function fmtTime(d: Date, tz: string) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  }).format(new Date(d))
}

function fmtCop(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(cents / 100)
}

// ── Componente ────────────────────────────────────────────────────────────────

type Phase = 'phone' | 'detail' | 'cancelled'

export function AppointmentPortal({ appointmentId }: { appointmentId: string }) {
  const [phase, setPhase]             = useState<Phase>('phone')
  const [digits, setDigits]           = useState('')
  const [apt, setApt]                 = useState<CustomerAppointment | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [confirming, setConfirming]   = useState(false)
  const [isPending, startTransition]  = useTransition()

  const e164 = `+57${digits}`

  // ── Paso 1: verificación por teléfono ──────────────────────────────────────
  function handlePhoneSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await getCustomerAppointmentAction(appointmentId, e164)
      if (!result) {
        setError('Cita no encontrada. Verifica tu número de teléfono.')
        return
      }
      setApt(result)
      setPhase('detail')
    })
  }

  // ── Paso 2: cancelación con confirmación inline ────────────────────────────
  function handleCancelClick() {
    if (!confirming) { setConfirming(true); return }
    setConfirming(false)
    setError(null)
    startTransition(async () => {
      const res = await cancelByCustomerAction(appointmentId, e164)
      if (!res.ok) { setError(res.error); return }
      setPhase('cancelled')
    })
  }

  // ── Pantalla final ─────────────────────────────────────────────────────────
  if (phase === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="font-medium">Cita cancelada</p>
        <p className="text-sm text-muted-foreground">
          Si tienes preguntas llama a{' '}
          {apt?.organization.phone ? (
            <a href={`tel:${apt.organization.phone}`} className="underline">
              {apt.organization.phone}
            </a>
          ) : (
            apt?.organization.name
          )}
          .
        </p>
      </div>
    )
  }

  // ── Paso 1: ingresa teléfono ───────────────────────────────────────────────
  if (phase === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Tu número de celular / WhatsApp</Label>
          <div className="flex items-center overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="flex items-center gap-1.5 border-r border-input bg-muted px-3 py-2 text-sm text-muted-foreground select-none">
              <Phone className="h-3.5 w-3.5" />
              +57
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="\d{10}"
              placeholder="300 000 0000"
              maxLength={10}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, ''))}
              required
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ingresa el número que usaste al reservar.
          </p>
        </div>

        <ErrorMessage message={error} />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Buscando…' : 'Ver mi cita'}
        </Button>
      </form>
    )
  }

  // ── Paso 2: detalle de la cita ─────────────────────────────────────────────
  if (!apt) return null

  const tz         = apt.organization.timezone
  const statusInfo = STATUS_LABEL[apt.status] ?? { text: 'Pendiente', variant: 'secondary' as const }
  const canCancel  = apt.status === 'pending' || apt.status === 'confirmed'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{apt.organization.name}</p>
        <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">{apt.service.name}</p>
            <p className="text-muted-foreground">
              con {apt.barber.nickname ?? apt.barber.displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="capitalize">{fmtDate(apt.startAt, tz)}</p>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p>
            {fmtTime(apt.startAt, tz)} – {fmtTime(apt.endAt, tz)}
            <span className="ml-2 text-muted-foreground">({apt.service.durationMin} min)</span>
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-right font-medium">
          {fmtCop(apt.service.priceCop)}
        </div>
      </div>

      <ErrorMessage message={error} />

      {canCancel && (
        <div className="space-y-2 border-t border-border pt-4">
          {confirming ? (
            <>
              <p className="text-sm text-muted-foreground">¿Confirmas que deseas cancelar esta cita?</p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelClick}
                  disabled={isPending}
                >
                  {isPending ? 'Cancelando…' : 'Sí, cancelar'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setConfirming(false); setError(null) }}
                  disabled={isPending}
                >
                  Volver
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={handleCancelClick}
            >
              Cancelar cita
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}
