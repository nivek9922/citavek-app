'use client'
import { Star, Gift, Sparkles } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import type { LoyaltyProgress } from '../domain/loyalty'

interface Props {
  progress: LoyaltyProgress
}

/**
 * Badge de progreso del programa de fidelidad para el booking (storefront).
 * Presentacional: el padre decide cuándo mostrarlo (solo cuando hay progreso).
 */
export function LoyaltyBadge({ progress }: Props) {
  const { completedVisits, requiredVisits, remaining, percentage, rewardPending, rewardDescription, isNearReward } = progress

  // Estado de celebración: recompensa lista para usarse.
  if (rewardPending) {
    return (
      <div className="space-y-2 rounded-2xl border border-primary/40 bg-(--bg-selected) p-4 shadow-sf-selected">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Gift className="h-4 w-4 text-primary" />
          ¡Tienes una recompensa!
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{rewardDescription}</span>. Se aplicará automáticamente a esta cita.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card-soft p-4 shadow-sf-card">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Star className="h-4 w-4 fill-primary text-primary" />
        Tu programa de fidelidad
      </div>

      <ProgressBar completed={completedVisits} required={requiredVisits} percentage={percentage} />

      <p className={cn('text-sm', isNearReward ? 'font-medium text-foreground' : 'text-muted-foreground')}>
        {isNearReward ? (
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            ¡Te falta solo 1 para {lower(rewardDescription)}!
          </span>
        ) : (
          <>Llevas {completedVisits} de {requiredVisits}. Te faltan {remaining} para {lower(rewardDescription)}.</>
        )}
      </p>
    </div>
  )
}

/** Tarjeta de sellos cuando el umbral es pequeño; barra continua si es grande. */
function ProgressBar({ completed, required, percentage }: { completed: number; required: number; percentage: number }) {
  if (required <= 10) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: required }).map((_, i) => (
            <span
              key={i}
              className={cn('h-2.5 flex-1 rounded-full transition-smooth', i < completed ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {completed} / {required}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary transition-smooth" style={{ width: `${percentage}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
        {completed} / {required}
      </span>
    </div>
  )
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
