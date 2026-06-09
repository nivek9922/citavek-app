import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import type { WeekDay } from '@/modules/analytics/queries'

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-primary',
  pending:   'bg-yellow-400',
  completed: 'bg-green-500',
  no_show:   'bg-orange-400',
}

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Props {
  slug:         string
  weekDays:     WeekDay[]
  todayStr:     string
  prevWeekStr:  string
  nextWeekStr:  string
  weekLabel:    string
  timezone:     string
}

export function AgendaWeekView({
  slug, weekDays, todayStr, prevWeekStr, nextWeekStr, weekLabel, timezone,
}: Props) {
  const base = `/${slug}/panel`

  return (
    <div className="space-y-3">
      {/* ── Navegación semanal ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={`${base}?view=week&week=${prevWeekStr}`}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <span className="min-w-44 text-center text-sm font-semibold capitalize">
            {weekLabel}
          </span>

          <Link
            href={`${base}?view=week&week=${nextWeekStr}`}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Ir a semana actual si no estamos en ella */}
        {!weekDays.some((d) => d.dateStr === todayStr) && (
          <Link
            href={`${base}?view=week`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-smooth hover:border-primary/50 hover:text-primary"
          >
            Esta semana
          </Link>
        )}
      </div>

      {/* ── Grid 7 columnas ── */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <div className="grid min-w-140 grid-cols-7">
          {weekDays.map(({ dateStr, appointments }, colIdx) => {
            const date    = parseISO(dateStr)
            const isToday = dateStr === todayStr
            const visible = appointments.slice(0, 4)
            const extra   = appointments.length - visible.length

            return (
              <div
                key={dateStr}
                className={cn(
                  'flex flex-col min-h-40 border-border',
                  colIdx < 6 && 'border-r',
                )}
              >
                {/* Cabecera del día — navega a vista diaria */}
                <Link
                  href={`${base}?date=${dateStr}`}
                  className={cn(
                    'flex flex-col items-center gap-0.5 border-b border-border py-2 transition-smooth hover:bg-accent/60',
                    isToday && 'bg-primary/8',
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {DAY_SHORT[colIdx]}
                  </span>
                  <span className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                    isToday
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground',
                  )}>
                    {format(date, 'd')}
                  </span>
                  {appointments.length > 0 && (
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
                    </span>
                  )}
                </Link>

                {/* Citas del día */}
                <div className="flex flex-1 flex-col gap-1 p-1.5">
                  {visible.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-start gap-1 rounded-md bg-card px-1.5 py-1 text-[10px] leading-tight border border-border/60"
                    >
                      <span className={cn(
                        'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        STATUS_DOT[apt.status] ?? 'bg-muted-foreground',
                      )} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {formatInTimeZone(new Date(apt.startAt), timezone, 'HH:mm')}
                        </p>
                        <p className="truncate text-muted-foreground">
                          {apt.customerName.split(' ')[0]}
                        </p>
                      </div>
                    </div>
                  ))}

                  {extra > 0 && (
                    <Link
                      href={`${base}?date=${dateStr}`}
                      className="rounded-md px-1.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition-smooth"
                    >
                      +{extra} más
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 px-1 text-[10px] text-muted-foreground">
        {[
          { color: 'bg-primary',     label: 'Confirmada' },
          { color: 'bg-yellow-400',  label: 'Pendiente'  },
          { color: 'bg-green-500',   label: 'Completada' },
          { color: 'bg-orange-400',  label: 'No llegó'   },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
