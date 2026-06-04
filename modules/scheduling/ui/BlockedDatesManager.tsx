'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, CalendarOff, Trash2 } from 'lucide-react'
import { Button }  from '@/shared/ui/button'
import { Input }   from '@/shared/ui/input'
import { Label }   from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { blockBarberDateAction, unblockBarberDateAction } from '../actions'
import type { ScheduleExceptionDTO } from '../queries'

interface Barber {
  id:          string
  displayName: string
}

interface Props {
  tenantSlug: string
  exceptions: ScheduleExceptionDTO[]
  barbers:    Barber[]
}

const TODAY = new Date().toISOString().split('T')[0] ?? ''

function formatDate(dateStr: string) {
  const [y = 0, m = 0, d = 0] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

export function BlockedDatesManager({ tenantSlug, exceptions, barbers }: Props) {
  const [list, setList]           = useState<ScheduleExceptionDTO[]>(exceptions)
  const [date, setDate]           = useState('')
  const [scope, setScope]         = useState<string>('org')
  const [reason, setReason]       = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const upcoming = list.filter((e) => e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))
  const past     = list.filter((e) => e.date <  TODAY).sort((a, b) => b.date.localeCompare(a.date))

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    setError(null)

    startTransition(async () => {
      const barberId = scope === 'org' ? null : scope
      const res = await blockBarberDateAction(tenantSlug, {
        barberId,
        dateStr: date,
        reason:  reason.trim() || undefined,
      })

      if (!res.ok) { setError(res.error); return }

      const barberName = barberId ? barbers.find((b) => b.id === barberId)?.displayName ?? null : null
      const newEntry: ScheduleExceptionDTO = {
        id:       crypto.randomUUID(),
        date,
        reason:   reason.trim() || null,
        barberId: barberId ?? null,
        barber:   barberName ? { displayName: barberName } : null,
      }
      setList((prev) => [...prev, newEntry])
      setDate('')
      setReason('')
    })
  }

  function handleDelete(id: string, barberId: string | null, dateStr: string) {
    startTransition(async () => {
      await unblockBarberDateAction(tenantSlug, { barberId, dateStr })
      setList((prev) => prev.filter((e) => e.id !== id))
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Días bloqueados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bloquea festivos, vacaciones o días que no habrá atención. Los clientes no verán slots disponibles en esas fechas.
        </p>
      </div>

      {/* ── Formulario ── */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <p className="font-medium text-sm">Agregar bloqueo</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="block-date">Fecha</Label>
            <Input
              id="block-date"
              type="date"
              min={TODAY}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="block-scope">¿A quién aplica?</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="block-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">Toda la barbería</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="block-reason">
            Motivo <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="block-reason"
            placeholder="Festivo nacional, vacaciones…"
            value={reason}
            maxLength={120}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={isPending || !date} className="w-full sm:w-auto">
          {isPending ? 'Guardando…' : 'Bloquear día'}
        </Button>
      </form>

      {/* ── Lista próximos ── */}
      <Section
        title="Próximos bloqueos"
        items={upcoming}
        onDelete={handleDelete}
        isPending={isPending}
        empty="No hay días bloqueados próximamente."
      />

      {/* ── Lista pasados ── */}
      {past.length > 0 && (
        <Section
          title="Bloqueos pasados"
          items={past}
          onDelete={handleDelete}
          isPending={isPending}
        />
      )}
    </div>
  )
}

// ── Sub-componente lista ──────────────────────────────────────────────────────

function Section({
  title, items, onDelete, isPending, empty,
}: {
  title:     string
  items:     ScheduleExceptionDTO[]
  onDelete:  (id: string, barberId: string | null, dateStr: string) => void
  isPending: boolean
  empty?:    string
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>

      {items.length === 0 && empty ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          <CalendarOff className="h-4 w-4 shrink-0" />
          {empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium capitalize">{formatDate(ex.date)}</p>
                <p className="text-xs text-muted-foreground">
                  {ex.barber ? ex.barber.displayName : 'Toda la barbería'}
                  {ex.reason ? ` · ${ex.reason}` : ''}
                </p>
              </div>
              <button
                onClick={() => onDelete(ex.id, ex.barberId, ex.date)}
                disabled={isPending}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                aria-label="Eliminar bloqueo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
