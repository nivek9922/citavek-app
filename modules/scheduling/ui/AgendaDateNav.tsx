import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  slug:      string
  label:     string
  prevDate:  string
  nextDate:  string
  isToday:   boolean
  count:     number
}

export function AgendaDateNav({ slug, label, prevDate, nextDate, isToday, count }: Props) {
  const base = `/${slug}/panel`

  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Link
          href={`${base}?date=${prevDate}`}
          aria-label="Día anterior"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground sm:h-8 sm:w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <span className="min-w-32 text-center text-sm font-semibold">
          {label}
          <span className="ml-1.5 font-normal text-muted-foreground">
            · {count} {count === 1 ? 'cita' : 'citas'}
          </span>
        </span>

        <Link
          href={`${base}?date=${nextDate}`}
          aria-label="Día siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground sm:h-8 sm:w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {!isToday && (
        <Link
          href={base}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-smooth hover:border-primary/50 hover:text-primary"
        >
          Ir a hoy
        </Link>
      )}
    </div>
  )
}
