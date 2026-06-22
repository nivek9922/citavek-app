'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldAlert, Users, CalendarX, TrendingDown, Minus, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/ui/utils'
import { upsertNoShowPolicyAction } from '../actions'
import type { NoShowPolicy, NoShowOwnerStats } from '../domain/ports/no-show-repository'

interface Props {
  tenantSlug: string
  policy: NoShowPolicy | null
  stats: NoShowOwnerStats
}

export function NoShowPolicyConfig({ tenantSlug, policy, stats }: Props) {
  const [isActive, setIsActive] = useState(policy?.isActive ?? true)
  const [strikeThreshold, setStrikeThreshold] = useState(policy?.strikeThreshold ?? 3)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await upsertNoShowPolicyAction(tenantSlug, { isActive, strikeThreshold })
      if (res.ok) toast.success('Política de no-shows guardada.')
      else toast.error(res.error)
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Política de no-shows</h2>
        <p className="text-sm text-muted-foreground">
          Recibe una alerta visual cuando un cliente acumula demasiados no-shows. Tú decides qué hacer.
        </p>
      </div>

      <Stats stats={stats} />

      <Section icon={<ShieldAlert className="h-5 w-5 text-orange-400" />} title="Configuración">
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">Seguimiento activo</p>
            <p className="text-xs text-muted-foreground">
              Si lo desactivas, los badges de alerta dejan de mostrarse en la agenda.
            </p>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} label="Activar seguimiento" />
        </div>

        <div className="space-y-1.5">
          <Label>No-shows para activar la alerta</Label>
          <p className="text-xs text-muted-foreground">
            Strikes activos en los últimos 90 días (los perdonados no cuentan).
          </p>
          <Stepper value={strikeThreshold} min={1} max={10} onChange={setStrikeThreshold} />
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm text-orange-400">
          Esto no bloquea al cliente automáticamente — solo te avisa en la agenda para que decidas qué hacer.
        </div>

        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar cambios'}
        </Button>
      </Section>
    </div>
  )
}

function Stats({ stats }: { stats: NoShowOwnerStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatCard icon={Users} label="Clientes en riesgo ahora" value={String(stats.atRiskCount)} />
      <StatCard icon={CalendarX} label="No-shows este mes" value={String(stats.noShowsThisMonth)} />
      <StatCard icon={TrendingDown} label="Tasa de no-show (mes)" value={`${stats.noShowRate}%`} />
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
        aria-label="Strikes para alerta"
      />
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
