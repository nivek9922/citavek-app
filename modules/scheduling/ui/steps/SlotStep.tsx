'use client'
import { useState, useTransition } from 'react'
import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { Clock } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { DatePicker } from '@/shared/ui/date-picker'
import { getAvailableSlotsAction } from '../../actions'
import type { BarberDTO } from '@/modules/staff/queries'

interface Props {
  tenantSlug: string
  barber:     BarberDTO
  serviceId:  string
  selectedAt: Date | undefined
  onSelect:   (startAt: Date) => void
  timezone:   string
  todayStr:   string // YYYY-MM-DD en TZ del tenant (mínimo seleccionable)
}

/**
 * Paso 3 — fecha + hora. Usa el <DatePicker> obligatorio y consume el MISMO motor
 * de slots que el booking público (getAvailableSlotsAction). Solo se muestran los
 * horarios que devuelve el motor: no hay input de hora libre.
 *
 * Sin useEffect: el fetch lo dispara siempre el usuario al elegir la fecha, igual
 * que StepDateTime del flujo público (la regla react-hooks/set-state-in-effect
 * prohíbe setState al montar).
 */
export function SlotStep({ tenantSlug, barber, serviceId, selectedAt, onSelect, timezone, todayStr }: Props) {
  const [date,      setDate]      = useState<Date | undefined>(undefined)
  const [slots,     setSlots]     = useState<Date[]>([])
  const [busyCount, setBusyCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  function handleDate(d: Date | undefined) {
    setDate(d)
    setSlots([])
    setBusyCount(0)
    if (!d) return
    startTransition(async () => {
      const res = await getAvailableSlotsAction(tenantSlug, {
        barberId:  barber.id,
        serviceId,
        dateISO:   d.toISOString(),
      })
      setSlots(res.slots.map((s) => new Date(s)))
      setBusyCount(res.busyCount)
    })
  }

  const total = slots.length + busyCount
  const pct   = total > 0 ? Math.round((busyCount / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Fecha</p>
        <DatePicker
          modal
          value={date}
          onChange={handleDate}
          placeholder="Selecciona fecha"
          min={parseISO(todayStr)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Horarios disponibles</span>
        </div>

        {!date ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Selecciona una fecha para ver los horarios.
          </p>
        ) : isPending ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/20 py-6 text-center">
            <span className="text-2xl">📅</span>
            <p className="text-sm font-medium">No hay horarios disponibles para esta fecha</p>
            <p className="text-xs text-muted-foreground">Prueba con otro día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{slots.length} horarios libres</span>
              {busyCount > 0 && <span>{pct}% ocupado</span>}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {slots.map((slot) => {
                const selected = selectedAt?.getTime() === slot.getTime()
                return (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    onClick={() => onSelect(slot)}
                    className={cn(
                      'rounded-xl border py-2.5 text-sm font-semibold transition-smooth',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-accent/30',
                    )}
                  >
                    {formatInTimeZone(slot, timezone, 'HH:mm')}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
