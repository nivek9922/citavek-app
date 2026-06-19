'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Percent, Coins, AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/ui/utils'
import { upsertBarberCommissionAction } from '../actions'
import type { CommissionTypeValue } from '../domain/commission'
import type { BarberCommissionRecord } from '../domain/ports/commissions-repository'

export function CommissionConfig({
  tenantSlug,
  configs,
}: {
  tenantSlug: string
  configs: BarberCommissionRecord[]
}) {
  if (configs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes barberos activos. Añade tu equipo en la sección Equipo para configurar comisiones.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Define cómo se calcula la comisión de cada barbero. Se aplica a las citas completadas.
      </p>
      {configs.map((c) => (
        <BarberRow key={c.barberId} tenantSlug={tenantSlug} record={c} />
      ))}
    </div>
  )
}

function BarberRow({ tenantSlug, record }: { tenantSlug: string; record: BarberCommissionRecord }) {
  const [type, setType]               = useState<CommissionTypeValue>(record.config?.commissionType ?? 'PERCENTAGE')
  const [percentage, setPercentage]   = useState(record.config?.percentage ?? 45)
  const [fixedAmount, setFixedAmount] = useState(record.config?.fixedAmount ?? 10_000)
  const [configured, setConfigured]   = useState(record.config !== null)
  const [isPending, startTransition]  = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await upsertBarberCommissionAction(tenantSlug, {
        barberId:       record.barberId,
        commissionType: type,
        percentage:     type === 'PERCENTAGE' ? percentage : null,
        fixedAmount:    type === 'FIXED_PER_SERVICE' ? fixedAmount : null,
      })
      if (res.ok) {
        setConfigured(true)
        toast.success(`Comisión de ${record.nickname ?? record.displayName} guardada.`)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {record.displayName}
          {record.nickname ? <span className="text-muted-foreground"> &quot;{record.nickname}&quot;</span> : null}
        </p>
        {!configured && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400">
            <AlertTriangle className="h-3 w-3" /> Sin configurar
          </span>
        )}
      </div>

      {!configured && (
        <p className="text-xs text-muted-foreground">
          Sin comisión configurada — las ganancias de este barbero no se calcularán hasta que la configures.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <TypeButton
          active={type === 'PERCENTAGE'}
          onClick={() => setType('PERCENTAGE')}
          icon={<Percent className="h-4 w-4" />}
          label="Porcentaje"
          hint="% del total de cada cita"
        />
        <TypeButton
          active={type === 'FIXED_PER_SERVICE'}
          onClick={() => setType('FIXED_PER_SERVICE')}
          icon={<Coins className="h-4 w-4" />}
          label="Monto fijo"
          hint="COP por cada servicio"
        />
      </div>

      <div className="flex items-end gap-3">
        {type === 'PERCENTAGE' ? (
          <div className="space-y-1.5">
            <Label htmlFor={`pct-${record.barberId}`}>Porcentaje</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`pct-${record.barberId}`}
                type="number"
                min={1}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor={`fix-${record.barberId}`}>Monto por servicio</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id={`fix-${record.barberId}`}
                type="number"
                min={1}
                step={1000}
                value={fixedAmount}
                onChange={(e) => setFixedAmount(Number(e.target.value))}
                className="w-40"
              />
            </div>
          </div>
        )}
        <Button onClick={handleSave} disabled={isPending} size="sm" className="ml-auto">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}

function TypeButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-[1.5px] p-3 text-left transition-smooth',
        active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </button>
  )
}
