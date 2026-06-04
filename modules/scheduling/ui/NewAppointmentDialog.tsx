'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/shared/ui/dialog'
import { Button }   from '@/shared/ui/button'
import { Input }    from '@/shared/ui/input'
import { Label }    from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { formatCop, formatDuration } from '@/shared/format'
import { createManualAppointmentAction } from '../actions'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  tenantSlug:  string
  services:    ServiceDTO[]
  barbers:     BarberDTO[]
  defaultDate: string // YYYY-MM-DD
}

export function NewAppointmentDialog({ tenantSlug, services, barbers, defaultDate }: Props) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [isPending, start]  = useTransition()
  const [error, setError]   = useState('')

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd    = new FormData(e.currentTarget)
    const phone = `+57${String(fd.get('phone') ?? '').replace(/\D/g, '').slice(0, 10)}`

    start(async () => {
      const res = await createManualAppointmentAction(tenantSlug, {
        serviceId:     String(fd.get('serviceId')),
        barberId:      String(fd.get('barberId')),
        dateStr:       String(fd.get('dateStr')),
        timeStr:       String(fd.get('timeStr')),
        customerName:  String(fd.get('customerName')),
        customerPhone: phone,
        notes:         (fd.get('notes') as string) || undefined,
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const disabled = services.length === 0 || barbers.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled} title={disabled ? 'Necesitas al menos un servicio y un barbero' : undefined}>
          <Plus className="h-4 w-4" /> Nueva cita
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva cita manual</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="serviceId">Servicio</Label>
            <select id="serviceId" name="serviceId" required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatDuration(s.durationMin)} · {formatCop(s.priceCop)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="barberId">Barbero</Label>
            <select id="barberId" name="barberId" required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nickname ? `${b.displayName.split(' ')[0]} "${b.nickname}"` : b.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateStr">Fecha</Label>
              <Input id="dateStr" name="dateStr" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeStr">Hora</Label>
              <Input id="timeStr" name="timeStr" type="time" defaultValue="09:00" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customerName">Nombre del cliente</Label>
            <Input id="customerName" name="customerName" placeholder="Ej. Juan Pérez" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp (10 dígitos)</Label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                +57
              </span>
              <Input id="phone" name="phone" inputMode="numeric" maxLength={10} placeholder="3104567890" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={300} placeholder="Cualquier detalle…" />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</> : 'Crear cita'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
