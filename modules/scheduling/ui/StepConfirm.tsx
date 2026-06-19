'use client'
import { useEffect, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Calendar, Clock, Scissors, Gift } from 'lucide-react'
import { Separator } from '@/shared/ui/separator'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { PhoneInput } from '@/shared/ui/phone-input'
import { formatCop, formatDuration } from '@/shared/format'
import { isAnyBarber } from '@/modules/scheduling/domain/any-barber'
import { getLoyaltyStatusAction } from '@/modules/loyalty/actions'
import { LoyaltyBadge } from '@/modules/loyalty/ui/LoyaltyBadge'
import type { LoyaltyStatusView } from '@/modules/loyalty/application/get-loyalty-status'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

const PHONE_RE = /^\+\d{7,15}$/

interface Props {
  tenantSlug:       string
  services:         ServiceDTO[]
  totalPriceCop:    number
  totalDurationMin: number
  barber:           BarberDTO
  startAt:          Date
  customerName:     string
  customerPhone:    string
  onCustomer:       (name: string, phone: string) => void
  onConfirm:        () => void
  isPending:        boolean
  canConfirm:       boolean
}

export function StepConfirm({
  tenantSlug, services, totalPriceCop, totalDurationMin, barber, startAt, customerName, customerPhone,
  onCustomer, onConfirm, isPending, canConfirm,
}: Props) {
  const [loyalty, setLoyalty] = useState<LoyaltyStatusView | null>(null)
  const [, startLoyalty] = useTransition()

  // Consulta el progreso cuando el teléfono es válido (debounce). El resultado solo
  // controla la visibilidad del badge; el descuento real se valida server-side al reservar.
  const serviceIdsKey = services.map((s) => s.id).join(',')
  useEffect(() => {
    const phone = customerPhone.replace(/\s/g, '')
    const valid = PHONE_RE.test(phone)
    // El setState ocurre dentro del timeout (tick posterior), no en el cuerpo del effect.
    const timer = setTimeout(() => {
      if (!valid) {
        setLoyalty(null)
        return
      }
      startLoyalty(async () => {
        const res = await getLoyaltyStatusAction(tenantSlug, { phone, serviceIds: serviceIdsKey ? serviceIdsKey.split(',') : [] })
        setLoyalty(res)
      })
    }, valid ? 500 : 0)
    return () => clearTimeout(timer)
  }, [customerPhone, tenantSlug, serviceIdsKey])

  const discountCop = loyalty?.rewardDiscountCop ?? 0
  const finalPriceCop = Math.max(0, totalPriceCop - discountCop)

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="space-y-3 rounded-2xl border border-border bg-card-soft p-4 shadow-sf-card">
        <h3 className="font-semibold">Resumen de tu cita</h3>
        <Separator />
        <div className="space-y-3 text-sm">
          {/* Servicios con precio individual */}
          <div className="space-y-1.5">
            {services.map((svc) => (
              <div key={svc.id} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 shrink-0 text-primary" />
                  <span className="font-medium">{svc.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDuration(svc.durationMin)}</span>
                </div>
                <span className="tabular-nums text-muted-foreground">{formatCop(svc.priceCop)}</span>
              </div>
            ))}
          </div>
          <Separator />
          {/* Descuento de lealtad (si hay recompensa pendiente que aplica) */}
          {discountCop > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Gift className="h-4 w-4" />
                Recompensa de fidelidad
              </span>
              <span className="tabular-nums text-primary">−{formatCop(discountCop)}</span>
            </div>
          )}
          {/* Total — el elemento más prominente */}
          <div className="flex items-end justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Total · {formatDuration(totalDurationMin)}
            </span>
            <span className="flex items-baseline gap-2">
              {discountCop > 0 && (
                <span className="text-sm tabular-nums text-muted-foreground line-through">{formatCop(totalPriceCop)}</span>
              )}
              <span className="font-display text-2xl tracking-wide tabular-nums text-foreground">
                {formatCop(finalPriceCop)}
              </span>
            </span>
          </div>
          <Separator />
          <Row
            icon={<User className="h-4 w-4 text-primary" />}
            label={isAnyBarber(barber.id) ? 'Primer disponible' : barber.displayName}
            sub={!isAnyBarber(barber.id) && barber.nickname ? `"${barber.nickname}"` : undefined}
          />
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
            className="h-12 rounded-xl bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp</Label>
          <PhoneInput
            id="phone"
            value={customerPhone}
            onChange={(phone) => onCustomer(customerName, phone)}
          />
        </div>

        {loyalty && <LoyaltyBadge progress={loyalty.progress} />}
      </div>

      <Button
        className="min-h-13 w-full text-base"
        onClick={onConfirm}
        disabled={!canConfirm || isPending}
      >
        {isPending ? 'Confirmando…' : 'Confirmar reserva'}
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
