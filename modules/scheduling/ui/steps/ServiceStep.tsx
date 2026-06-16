'use client'
import Image from 'next/image'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { Button } from '@/shared/ui/button'
import { formatCop, formatDuration } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'

const CATEGORY_EMOJI: Record<string, string> = {
  corte: '✂️', barba: '🪒', combo: '💈', tratamiento: '✨', infantil: '👦',
}

interface Props {
  services:    ServiceDTO[]
  selectedIds: string[]
  onToggle:    (s: ServiceDTO) => void
  onContinue:  () => void
}

/** Paso 1 — elegir uno o más servicios. El precio/duración se suman. */
export function ServiceStep({ services, selectedIds, onToggle, onContinue }: Props) {
  const selected = services.filter((s) => selectedIds.includes(s.id))
  const totalPriceCop    = selected.reduce((sum, s) => sum + s.priceCop, 0)
  const totalDurationMin = selected.reduce((sum, s) => sum + s.durationMin, 0)
  const count = selected.length

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {services.map((svc) => {
          const isSelected = selectedIds.includes(svc.id)
          return (
            <button
              key={svc.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(svc)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-smooth',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-accent/30',
              )}
            >
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth',
                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              )}>
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </span>
              {svc.imageUrl ? (
                <Image
                  src={svc.imageUrl} alt={svc.name}
                  width={40} height={40}
                  unoptimized
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-xl">
                  {CATEGORY_EMOJI[svc.category] ?? '✂️'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{svc.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(svc.durationMin)}
                </p>
              </div>
              <p className={cn('shrink-0 font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                {formatCop(svc.priceCop)}
              </p>
            </button>
          )
        })}
      </div>

      <div className="sticky bottom-0 space-y-2 border-t border-border bg-background/95 pt-3 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {count === 0 ? 'Sin servicios' : `${count} ${count === 1 ? 'servicio' : 'servicios'}`}
          </span>
          {count > 0 && (
            <span className="font-semibold">
              Total: {formatCop(totalPriceCop)} · {formatDuration(totalDurationMin)}
            </span>
          )}
        </div>
        <Button type="button" className="w-full" onClick={onContinue} disabled={count === 0}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
