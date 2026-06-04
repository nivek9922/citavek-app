'use client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Calendar, Clock, Scissors } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { formatCop, formatDuration } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

interface Props {
  service:      ServiceDTO
  barber:       BarberDTO
  startAt:      Date
  customerName:  string
  customerPhone: string
  onCustomer:   (name: string, phone: string) => void
  onConfirm:    () => void
  isPending:    boolean
  canConfirm:   boolean
  error?:       string
}

export function StepConfirm({
  service, barber, startAt, customerName, customerPhone,
  onCustomer, onConfirm, isPending, canConfirm, error,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <h3 className="font-semibold">Resumen de tu cita</h3>
        <Separator />
        <div className="space-y-2 text-sm">
          <Row icon={<Scissors className="h-4 w-4 text-primary" />} label={service.name}
            sub={`${formatDuration(service.durationMin)} · ${formatCop(service.priceCop)}`} />
          <Row icon={<User className="h-4 w-4 text-primary" />} label={barber.displayName}
            sub={barber.nickname ? `"${barber.nickname}"` : undefined} />
          <Row icon={<Calendar className="h-4 w-4 text-primary" />}
            label={format(startAt, "EEEE d 'de' MMMM", { locale: es })} />
          <Row icon={<Clock className="h-4 w-4 text-primary" />}
            label={format(startAt, 'HH:mm')} />
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="space-y-3">
        <h3 className="font-semibold">Tus datos</h3>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            placeholder="Ej. Juan Pérez"
            value={customerName}
            onChange={(e) => onCustomer(e.target.value, customerPhone)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp (10 dígitos)</Label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
              +57
            </span>
            <Input
              id="phone"
              placeholder="3104567890"
              maxLength={10}
              value={customerPhone.replace('+57', '')}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                onCustomer(customerName, `+57${digits}`)
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        className="w-full"
        onClick={onConfirm}
        disabled={!canConfirm || isPending}
      >
        {isPending ? 'Confirmando…' : 'Confirmar cita'}
      </Button>
    </div>
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
