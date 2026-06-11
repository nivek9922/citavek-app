'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { AlertCircle, CalendarOff, Trash2 } from 'lucide-react'
import { Button }     from '@/shared/ui/button'
import { Input }      from '@/shared/ui/input'
import { Label }      from '@/shared/ui/label'
import { DatePicker } from '@/shared/ui/date-picker'
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
  todayStr:   string
}

function formatDate(dateStr: string) {
  const [y = 0, m = 0, d = 0] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

export function BlockedDatesManager({ tenantSlug, exceptions, barbers, todayStr }: Props) {
  const [list, setList]           = useState<ScheduleExceptionDTO[]>(exceptions)
  const [date, setDate]           = useState<Date | undefined>(undefined)
  const [scope, setScope]         = useState<string>('org')
  const [reason, setReason]       = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const upcoming = list.filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
  const past     = list.filter((e) => e.date <  todayStr).sort((a, b) => b.date.localeCompare(a.date))

  async function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!date) return
    setError(null)
    setIsPending(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    try {
      const barberId = scope === 'org' ? null : scope
      const res = await blockBarberDateAction(tenantSlug, {
        barberId,
        dateStr,
        reason: reason.trim() || undefined,
      })

      if (!res.ok) {
        setError(res.error ?? null)
        toast.error(res.error ?? 'No se pudo bloquear el día.')
        return
      }

      const barberName = barberId ? barbers.find((b) => b.id === barberId)?.displayName ?? null : null
      const newEntry: ScheduleExceptionDTO = {
        id:       crypto.randomUUID(),
        date:     dateStr,
        reason:   reason.trim() || null,
        barberId: barberId ?? null,
        barber:   barberName ? { displayName: barberName } : null,
      }
      setList((prev) => [...prev, newEntry])
      setDate(undefined)
      setReason('')
      toast.success('Día bloqueado correctamente')
    } finally {
      setIsPending(false)
    }
  }

  async function handleDelete(id: string, barberId: string | null, dateStr: string) {
    setIsPending(true)
    try {
      await unblockBarberDateAction(tenantSlug, { barberId, dateStr })
      setList((prev) => prev.filter((e) => e.id !== id))
      toast.success('Bloqueo eliminado')
    } finally {
      setIsPending(false)
    }
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
            <Label>Fecha</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              min={new Date(todayStr + 'T00:00:00')}
              placeholder="Selecciona una fecha"
              disabled={isPending}
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

        <Button type="submit" disabled={isPending || !date} className="w-full sm:w-auto" size="sm">
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
