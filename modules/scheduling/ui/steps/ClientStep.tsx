'use client'
import { useState } from 'react'
import { es } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { User, Calendar, Clock, Scissors, Loader2 } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import { Separator } from '@/shared/ui/separator'
import { formatCop, formatDuration } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

export interface ManualCustomer {
  name:  string
  phone: string // E.164 (+57XXXXXXXXXX)
  notes: string
}

interface Props {
  service:   ServiceDTO
  barber:    BarberDTO
  startAt:   Date
  timezone:  string
  isPending: boolean
  onConfirm: (customer: ManualCustomer) => void
}

/** Paso 4 — datos del cliente + resumen + confirmación. */
export function ClientStep({ service, barber, startAt, timezone, isPending, onConfirm }: Props) {
  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('') // solo 10 dígitos, sin prefijo
  const [notes, setNotes] = useState('')

  const phoneOk   = /^\d{10}$/.test(phone)
  const canConfirm = name.trim().length >= 2 && phoneOk

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canConfirm || isPending) return
    onConfirm({ name: name.trim(), phone: `+57${phone}`, notes })
  }

  const barberName = barber.nickname
    ? `${barber.displayName.split(' ')[0]} "${barber.nickname}"`
    : barber.displayName

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumen */}
      <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
        <h3 className="font-semibold">Resumen de la cita</h3>
        <Separator />
        <div className="space-y-2 text-sm">
          <Row icon={<Scissors className="h-4 w-4 text-primary" />} label={service.name}
            sub={`${formatDuration(service.durationMin)} · ${formatCop(service.priceCop)}`} />
          <Row icon={<User className="h-4 w-4 text-primary" />} label={barberName} />
          <Row icon={<Calendar className="h-4 w-4 text-primary" />}
            label={formatInTimeZone(startAt, timezone, "EEEE d 'de' MMMM", { locale: es })} />
          <Row icon={<Clock className="h-4 w-4 text-primary" />}
            label={formatInTimeZone(startAt, timezone, 'HH:mm')} />
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="space-y-1.5">
        <Label htmlFor="customerName">Nombre del cliente</Label>
        <Input
          id="customerName"
          placeholder="Ej. Juan Pérez"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">WhatsApp (10 dígitos)</Label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
            +57
          </span>
          <Input
            id="phone"
            inputMode="numeric"
            maxLength={10}
            placeholder="3104567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          rows={2}
          maxLength={300}
          placeholder="Cualquier detalle…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={!canConfirm || isPending} className="w-full">
        {isPending
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</>
          : 'Confirmar cita'}
      </Button>
    </form>
  )
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <span className="font-medium">{label}</span>
        {sub && <span className="ml-1.5 text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}
