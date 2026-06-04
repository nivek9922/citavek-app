'use client'
import { useEffect, useState, useTransition } from 'react'
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, isSameDay, isSameMinute } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/shared/ui/utils'
import { getAvailableSlotsAction } from '../actions'
import type { BarberDTO } from '@/modules/staff/queries'

// Días a mostrar por página. Valor inicial y avance por página.
const PAGE_SIZE = 7

interface Props {
  tenantSlug:  string
  barber:      BarberDTO
  durationMin: number
  selectedAt:  Date | undefined
  onSelect:    (startAt: Date) => void
}

export function StepDateTime({ tenantSlug, barber, durationMin, selectedAt, onSelect }: Props) {
  const [offset,       setOffset]       = useState(0)  // cuántos días desde hoy empieza la página
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [slots,        setSlots]        = useState<Date[]>([])
  const [isPending,    startTransition] = useTransition()

  // Días de la página actual: empezamos en mañana (+1 día desde hoy)
  const days = Array.from({ length: PAGE_SIZE }, (_, i) => addDays(new Date(), 1 + offset + i))

  // Cuando cambia la fecha seleccionada, pide los slots disponibles.
  // No llamamos setState síncronamente dentro del effect: usamos startTransition
  // para envolver toda la actualización. isPending maneja el estado de carga en el UI.
  useEffect(() => {
    if (!selectedDate) return
    startTransition(async () => {
      const res = await getAvailableSlotsAction(tenantSlug, {
        barberId:    barber.id,
        dateISO:     selectedDate.toISOString(),
        durationMin,
      })
      setSlots(res.slots.map((s) => new Date(s)))
    })
  }, [selectedDate, barber.id, durationMin, tenantSlug])

  // Nota: el reset al cambiar barber/duration lo maneja el `key` en BookingFlow.
  // Este componente se desmonta y remonta limpio cuando cambia la key.

  return (
    <div className="space-y-5">
      {/* ── Selector de día ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Elige el día</h3>
          </div>
          {/* Navegación por páginas */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setOffset((o) => Math.max(0, o - PAGE_SIZE)); setSelectedDate(undefined) }}
              disabled={offset === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-20 text-center text-xs text-muted-foreground">
              {offset === 0
                ? 'Esta semana'
                : `+${offset} días`}
            </span>
            <button
              onClick={() => { setOffset((o) => o + PAGE_SIZE); setSelectedDate(undefined) }}
              disabled={offset >= 60} // máximo 60 días adelante
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const dayName    = format(day, 'EEE', { locale: es })
            const dayNum     = format(day, 'd')
            const monthShort = format(day, 'MMM', { locale: es })

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex flex-col items-center rounded-xl border py-2 transition-smooth',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-elegant'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30',
                )}
              >
                <span className="text-[10px] font-medium uppercase leading-none opacity-70">
                  {dayName}
                </span>
                <span className="mt-1 text-base font-bold leading-none">{dayNum}</span>
                <span className="mt-0.5 text-[9px] leading-none opacity-60">{monthShort}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Selector de hora ── */}
      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">
              Horarios disponibles ·{' '}
              <span className="font-normal text-muted-foreground">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </span>
            </h3>
          </div>

          {isPending ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/20 py-6 text-center">
              <span className="text-2xl">📅</span>
              <p className="text-sm font-medium">Sin disponibilidad</p>
              <p className="text-xs text-muted-foreground">
                Prueba con otro día o barbero.
              </p>
            </div>
          ) : (
            <>
              {/* Indicador de ocupación */}
              <OccupancyBar slots={slots} durationMin={durationMin} />

              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {slots.map((slot) => {
                  const isSelected = selectedAt && isSameMinute(slot, selectedAt)
                  return (
                    <button
                      key={slot.toISOString()}
                      onClick={() => onSelect(slot)}
                      className={cn(
                        'rounded-xl border py-2.5 text-sm font-semibold transition-smooth',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-elegant'
                          : 'border-border hover:border-primary/50 hover:bg-accent/30',
                      )}
                    >
                      {format(slot, 'HH:mm')}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Muestra qué tan ocupada está la agenda ese día
function OccupancyBar({ slots, durationMin }: { slots: Date[]; durationMin: number }) {
  // Estimamos la capacidad máxima del día: 11h de trabajo / duración del servicio
  const maxSlots    = Math.floor((11 * 60) / durationMin)
  const available   = slots.length
  const occupancy   = Math.max(0, 1 - available / maxSlots)
  const pct         = Math.round(occupancy * 100)

  const label =
    pct >= 80 ? '🔥 Muy solicitado' :
    pct >= 50 ? '⚡ Bastante ocupado' :
    pct >= 20 ? '✅ Buena disponibilidad' :
                '🟢 Alta disponibilidad'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{available} horarios libres</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct >= 80 ? 'bg-destructive' :
            pct >= 50 ? 'bg-warning' :
                        'bg-success',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
