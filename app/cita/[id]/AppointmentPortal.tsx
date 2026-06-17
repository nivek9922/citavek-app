'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Clock, MessageSquare, Phone, Scissors, User } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
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

function fmtCop(pesos: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(pesos)
}

// ── Componente ────────────────────────────────────────────────────────────────

type Phase = 'phone' | 'detail' | 'cancelled'

export function AppointmentPortal({ appointmentId }: { appointmentId: string }) {
  const [phase, setPhase]            = useState<Phase>('phone')
  const [digits, setDigits]          = useState('')
  const [apt, setApt]                = useState<CustomerAppointment | null>(null)
  const [error, setError]            = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  // ── Paso 2: cancelación (confirmada vía AlertDialog) ───────────────────────
  function handleCancel() {
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
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-display text-2xl tracking-wide">Cita cancelada</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Si tienes preguntas llama a{' '}
            {apt?.organization.phone ? (
              <a href={`tel:${apt.organization.phone}`} className="font-medium text-foreground underline">
                {apt.organization.phone}
              </a>
            ) : (
              apt?.organization.name
            )}
            .
          </p>
        </div>
      </div>
    )
  }

  // ── Paso 1: ingresa teléfono ───────────────────────────────────────────────
  if (phase === 'phone') {
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Tu número de celular / WhatsApp</Label>
          <div className="flex h-11 items-center overflow-hidden rounded-xl border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="flex h-full items-center gap-1.5 border-r border-input bg-muted px-3 text-sm text-muted-foreground select-none">
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
              className="h-full flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ingresa el número que usaste al reservar.
          </p>
        </div>

        <ErrorMessage message={error} />

        <Button type="submit" className="h-11 w-full text-base" disabled={isPending}>
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

      {/* Resumen — misma jerarquía que el Paso 4 del booking (StepConfirm) */}
      <div className="space-y-3 rounded-2xl border border-border bg-card-soft p-4 text-sm shadow-sf-card">
        <div className="space-y-1.5">
          {apt.services.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{s.name}</span>
              </div>
              <span className="tabular-nums text-muted-foreground">{fmtCop(s.priceCop)}</span>
            </div>
          ))}
        </div>

        <Separator />
        <div className="flex items-end justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Total · {apt.durationMin} min
          </span>
          <span className="font-display text-2xl tracking-wide tabular-nums text-foreground">
            {fmtCop(apt.priceCop)}
          </span>
        </div>

        <Separator />
        <Row icon={<User className="h-4 w-4 text-primary" />}
          label={apt.barber.nickname ?? apt.barber.displayName} />
        <Row icon={<Calendar className="h-4 w-4 text-primary" />}
          label={fmtDate(apt.startAt, tz)} capitalize />
        <Row icon={<Clock className="h-4 w-4 text-primary" />}
          label={`${fmtTime(apt.startAt, tz)} – ${fmtTime(apt.endAt, tz)} · ${apt.durationMin} min`} />
      </div>

      {apt.notes && (
        <div className="flex items-start gap-3 rounded-xl bg-muted px-3 py-2.5">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm italic text-muted-foreground">{apt.notes}</p>
        </div>
      )}

      <ErrorMessage message={error} />

      {canCancel && (
        <div className="border-t border-border pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
              >
                {isPending ? 'Cancelando…' : 'Cancelar cita'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Si necesitas otra hora tendrás que reservar de nuevo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

function Row({ icon, label, capitalize }: { icon: React.ReactNode; label: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <p className={capitalize ? 'capitalize' : undefined}>{label}</p>
    </div>
  )
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}
