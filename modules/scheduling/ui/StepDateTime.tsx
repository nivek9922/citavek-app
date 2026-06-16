'use client'
import { useState, useTransition } from 'react'
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, isSameDay, isSameMinute } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { cn } from '@/shared/ui/utils'
import { formatCop, formatDuration } from '@/shared/format'
import { getAvailableSlotsAction } from '../actions'
import type { BarberDTO } from '@/modules/staff/queries'
import type { ServiceDTO } from '@/modules/catalog/queries'

// Días a mostrar por página. Valor inicial y avance por página.
const PAGE_SIZE = 7

interface Props {
  tenantSlug:       string
  barber:           BarberDTO
  services:         ServiceDTO[]
  totalDurationMin: number
  totalPriceCop:    number
  selectedAt:       Date | undefined
  onSelect:         (startAt: Date) => void
  timezone:         string
}

export function StepDateTime({
  tenantSlug, barber, services, totalDurationMin, totalPriceCop, selectedAt, onSelect, timezone,
}: Props) {
  const [offset,       setOffset]       = useState(0)  // cuántos días desde hoy empieza la página
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [slots,        setSlots]        = useState<Date[]>([])
  const [busyCount,    setBusyCount]    = useState(0)
  const [isPending,    startTransition] = useTransition()

  // Días de la página actual: empezamos en mañana (+1 día desde hoy)
  const days = Array.from({ length: PAGE_SIZE }, (_, i) => addDays(new Date(), offset + i))

  // Selección de día: actualiza estado y dispara el fetch en la misma acción.
  // Sin useEffect: el flujo es siempre iniciado por el usuario, no por sincronización.
  // El reset al cambiar barber/duration lo maneja el `key` en BookingFlow
  // (este componente se desmonta y remonta limpio cuando cambia la key).
  function selectDay(day: Date) {
    setSelectedDate(day)
    setSlots([])
    setBusyCount(0)
    startTransition(async () => {
      const res = await getAvailableSlotsAction(tenantSlug, {
        barberId:   barber.id,
        serviceIds: services.map((s) => s.id),
        dateISO:    day.toISOString(),
      })
      setSlots(res.slots.map((s) => new Date(s)))
      setBusyCount(res.busyCount)
    })
  }

  return (
    <div className="space-y-5">
      {/* ── Resumen de servicios seleccionados ── */}
      <div className="rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm">
        <span className="font-medium">{services.map((s) => s.name).join(' + ')}</span>
        <span className="ml-1.5 text-muted-foreground">
          · {formatDuration(totalDurationMin)} · {formatCop(totalPriceCop)}
        </span>
      </div>

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
              onClick={() => { setOffset((o) => Math.max(0, o - PAGE_SIZE)); setSelectedDate(undefined); setSlots([]) }}
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
              onClick={() => { setOffset((o) => o + PAGE_SIZE); setSelectedDate(undefined); setSlots([]) }}
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
                onClick={() => selectDay(day)}
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
              <OccupancyBar slots={slots} busyCount={busyCount} />

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
                      {formatInTimeZone(slot, timezone, 'HH:mm')}
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

// Muestra qué tan ocupada está la agenda ese día según citas reales agendadas.
function OccupancyBar({ slots, busyCount }: { slots: Date[]; busyCount: number }) {
  const available = slots.length
  const total     = available + busyCount
  // Sin citas reales → 0 % ocupación, independientemente de la hora del día.
  const occupancy = total > 0 ? busyCount / total : 0
  const pct       = Math.round(occupancy * 100)

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
