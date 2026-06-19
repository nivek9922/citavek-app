'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Gift, Users, Award, Target, TrendingUp, Minus, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input }  from '@/shared/ui/input'
import { Label }  from '@/shared/ui/label'
import { cn }     from '@/shared/ui/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select'
import { upsertLoyaltyProgramAction } from '../actions'
import type { RewardTypeValue } from '../domain/loyalty'
import type { LoyaltyProgramRecord, LoyaltyOwnerStats } from '../domain/ports/loyalty-repository'

interface ServiceOption {
  id:   string
  name: string
}

interface Props {
  tenantSlug: string
  program:    LoyaltyProgramRecord | null
  services:   ServiceOption[]
  stats:      LoyaltyOwnerStats
}

const REWARD_OPTIONS: { value: RewardTypeValue; label: string; hint: string }[] = [
  { value: 'FREE_NEXT_VISIT', label: 'Próxima cita gratis', hint: '100% de descuento en la siguiente visita' },
  { value: 'DISCOUNT_PCT',    label: 'Descuento porcentual', hint: 'Un % sobre el total de la cita' },
  { value: 'DISCOUNT_AMOUNT', label: 'Descuento monto fijo', hint: 'Un valor fijo en pesos' },
  { value: 'FREE_SERVICE',    label: 'Servicio gratis',      hint: 'Un servicio específico sin costo' },
]

export function LoyaltyConfig({ tenantSlug, program, services, stats }: Props) {
  const [isActive,       setIsActive]       = useState(program?.isActive ?? true)
  const [requiredVisits, setRequiredVisits] = useState(program?.requiredVisits ?? 5)
  const [rewardType,     setRewardType]     = useState<RewardTypeValue>(program?.rewardType ?? 'FREE_NEXT_VISIT')
  const [discountPct,    setDiscountPct]    = useState(program?.discountPct ?? 50)
  const [discountAmount, setDiscountAmount] = useState(program?.discountAmount ?? 10000)
  const [freeServiceId,  setFreeServiceId]  = useState(program?.freeServiceId ?? services[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await upsertLoyaltyProgramAction(tenantSlug, {
        isActive,
        requiredVisits,
        rewardType,
        discountPct:    rewardType === 'DISCOUNT_PCT' ? discountPct : null,
        discountAmount: rewardType === 'DISCOUNT_AMOUNT' ? discountAmount : null,
        freeServiceId:  rewardType === 'FREE_SERVICE' ? (freeServiceId || null) : null,
      })
      if (res.ok) toast.success('Programa de fidelidad guardado.')
      else        toast.error(res.error)
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Programa de fidelidad</h2>
        <p className="text-sm text-muted-foreground">
          Premia a tus clientes recurrentes. Tras N citas completadas reciben la recompensa que elijas.
        </p>
      </div>

      <Stats stats={stats} />

      <Section icon={<Gift className="h-5 w-5 text-primary" />} title="Configuración">
        {/* Activo / inactivo */}
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Programa activo</p>
            <p className="text-xs text-muted-foreground">
              Si lo desactivas, las recompensas ya ganadas siguen siendo válidas.
            </p>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} label="Activar programa" />
        </div>

        {/* Visitas requeridas */}
        <div className="space-y-1.5">
          <Label>Citas necesarias para la recompensa</Label>
          <Stepper value={requiredVisits} min={1} max={20} onChange={setRequiredVisits} />
        </div>

        {/* Tipo de recompensa */}
        <div className="space-y-2">
          <Label>Tipo de recompensa</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {REWARD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRewardType(opt.value)}
                className={cn(
                  'rounded-xl border-[1.5px] p-3 text-left transition-smooth',
                  rewardType === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Parámetros condicionales */}
        {rewardType === 'DISCOUNT_PCT' && (
          <div className="space-y-1.5">
            <Label htmlFor="discountPct">Porcentaje de descuento</Label>
            <div className="flex items-center gap-2">
              <Input
                id="discountPct"
                type="number"
                min={1}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        )}

        {rewardType === 'DISCOUNT_AMOUNT' && (
          <div className="space-y-1.5">
            <Label htmlFor="discountAmount">Monto del descuento (COP)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="discountAmount"
                type="number"
                min={1}
                step={1000}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-40"
              />
            </div>
          </div>
        )}

        {rewardType === 'FREE_SERVICE' && (
          <div className="space-y-1.5">
            <Label>Servicio gratis</Label>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tienes servicios activos. Crea uno primero en la sección Servicios.
              </p>
            ) : (
              <Select value={freeServiceId} onValueChange={setFreeServiceId}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar cambios'}
        </Button>
      </Section>
    </div>
  )
}

function Stats({ stats }: { stats: LoyaltyOwnerStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={Users}      label="Clientes en el programa"     value={String(stats.totalCards)} />
      <StatCard icon={Award}      label="Recompensas canjeadas (mes)" value={String(stats.redeemedThisMonth)} />
      <StatCard icon={Target}     label="A 1 visita de su premio"     value={String(stats.oneVisitAway)} />
      <StatCard icon={TrendingUp} label="Retención (3+ visitas)"      value={`${stats.retentionRate}%`} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-2xl tracking-wide tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-smooth', checked ? 'bg-primary' : 'bg-border')}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-smooth',
          checked ? 'left-5.5' : 'left-0.5',
        )}
      />
    </button>
  )
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border p-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
        aria-label="Citas necesarias"
      />
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
