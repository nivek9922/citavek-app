'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { Button } from '@/shared/ui/button'
import { formatCop, formatDuration } from '@/shared/format'
import { categoryStyle } from '@/shared/category-style'
import type { ServiceDTO } from '@/modules/catalog/queries'

interface Props {
  services:         ServiceDTO[]
  selectedIds:      string[]
  onToggle:         (s: ServiceDTO) => void
  totalPriceCop:    number
  totalDurationMin: number
  onContinue:       () => void
}

/** Tarjeta seleccionable de un servicio (premium). Toda la card es tappable
 *  (target ≥64px). El nombre hace wrap, la descripción es visible con line-clamp-2
 *  y "Ver más" inline (estado local de UI, no afecta la selección). */
function ServiceSelectCard({
  svc, selected, onToggle,
}: {
  svc: ServiceDTO
  selected: boolean
  onToggle: (s: ServiceDTO) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasLongDesc = (svc.description?.length ?? 0) > 80
  const cat = categoryStyle(svc.category)

  return (
    <div
      className={cn(
        'sf-hover-lift rounded-2xl border-[1.5px] transition-smooth',
        selected
          ? 'border-primary bg-(--bg-selected) shadow-sf-selected'
          : 'border-border bg-card-soft shadow-sf-card hover:border-primary/30',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggle(svc)}
        className="flex min-h-16 w-full items-center gap-3.5 p-3.5 text-left"
      >
        {/* Icono / imagen del servicio */}
        {svc.imageUrl ? (
          <Image
            src={svc.imageUrl} alt={svc.name}
            width={52} height={52}
            unoptimized
            className="h-13 w-13 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className={cn(
            'flex h-13 w-13 shrink-0 items-center justify-center rounded-xl text-2xl transition-smooth',
            selected ? 'bg-primary/15' : cat.iconTint,
          )}>
            {cat.emoji}
          </span>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold leading-tight wrap-break-word">{svc.name}</span>
            <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', cat.chip)}>
              {cat.short}
            </span>
          </div>
          {svc.description && (
            <p className={cn(
              'mt-1 text-xs text-muted-foreground',
              !expanded && 'line-clamp-2',
            )}>
              {svc.description}
            </p>
          )}
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className={cn(
              'font-display text-base tracking-wide',
              selected ? 'text-primary' : 'text-foreground',
            )}>
              {formatCop(svc.priceCop)}
            </span>
            <span className="text-ink-faint">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(svc.durationMin)}
            </span>
          </p>
        </div>

        {/* Selector circular — se llena de --primary con check al seleccionar */}
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-smooth',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
        )}>
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      </button>

      {/* "Ver más" — control separado, fuera del botón de selección */}
      {hasLongDesc && (
        <div className="pb-2.5 pl-17.5 pr-3.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="py-1 text-xs font-semibold text-primary"
          >
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  )
}

export function StepService({
  services, selectedIds, onToggle, totalPriceCop, totalDurationMin, onContinue,
}: Props) {
  const count = selectedIds.length

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecciona uno o más servicios. El precio y la duración se suman.
      </p>

      <div className="space-y-2.5">
        {services.map((svc) => (
          <ServiceSelectCard
            key={svc.id}
            svc={svc}
            selected={selectedIds.includes(svc.id)}
            onToggle={onToggle}
          />
        ))}
      </div>

      {/* Resumen + avanzar — sticky al fondo de la pantalla, full-bleed en mobile */}
      <div className="sticky bottom-0 -mx-4 space-y-2.5 border-t border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur-sm sm:-mx-7 sm:px-7">
        {count > 0 && (
          <div className="flex items-center justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
            <span className="text-xs text-muted-foreground">
              {count} {count === 1 ? 'servicio' : 'servicios'} · {formatDuration(totalDurationMin)}
            </span>
            <span className="font-display text-xl tracking-wide text-foreground">
              {formatCop(totalPriceCop)}
            </span>
          </div>
        )}
        <Button
          className="min-h-13 w-full text-base"
          onClick={onContinue}
          disabled={count === 0}
        >
          {count === 0 ? 'Selecciona un servicio' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}
