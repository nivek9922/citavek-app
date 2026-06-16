'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { Button } from '@/shared/ui/button'
import { formatCop, formatDuration } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'

const CATEGORY_EMOJI: Record<string, string> = {
  corte: '✂️', barba: '🪒', combo: '💈', tratamiento: '✨', infantil: '👦',
}

const CATEGORY_COLOR: Record<string, string> = {
  corte:       'bg-blue-500/10 text-blue-400',
  barba:       'bg-amber-500/10 text-amber-400',
  combo:       'bg-primary/10 text-primary',
  tratamiento: 'bg-purple-500/10 text-purple-400',
  infantil:    'bg-green-500/10 text-green-400',
}

const CATEGORY_LABELS: Record<string, string> = {
  corte: 'Corte', barba: 'Barba', combo: 'Combo',
  tratamiento: 'Trat.', infantil: 'Niño',
}

interface Props {
  services:         ServiceDTO[]
  selectedIds:      string[]
  onToggle:         (s: ServiceDTO) => void
  totalPriceCop:    number
  totalDurationMin: number
  onContinue:       () => void
}

/** Tarjeta seleccionable de un servicio. Nombre con wrap a 2 líneas y descripción
 *  visible con "Ver más" inline (estado local, no afecta la selección). */
function ServiceSelectCard({
  svc, selected, onToggle,
}: {
  svc: ServiceDTO
  selected: boolean
  onToggle: (s: ServiceDTO) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasLongDesc = (svc.description?.length ?? 0) > 80

  return (
    <div
      className={cn(
        'rounded-xl border transition-smooth',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/40 hover:bg-accent/30',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggle(svc)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {/* Checkbox + icono */}
        <span className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        )}>
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
        {svc.imageUrl ? (
          <Image
            src={svc.imageUrl} alt={svc.name}
            width={48} height={48}
            unoptimized
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-2xl">
            {CATEGORY_EMOJI[svc.category] ?? '✂️'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              CATEGORY_COLOR[svc.category] ?? 'bg-muted text-muted-foreground',
            )}>
              {CATEGORY_LABELS[svc.category] ?? svc.category}
            </span>
            <span className="font-medium wrap-break-word">{svc.name}</span>
          </div>
          {svc.description && (
            <p className={cn(
              'mt-1 text-xs text-muted-foreground',
              !expanded && 'line-clamp-2',
            )}>
              {svc.description}
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <span className={cn('font-bold', selected ? 'text-primary' : 'text-foreground')}>
              {formatCop(svc.priceCop)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(svc.durationMin)}
            </span>
          </p>
        </div>
      </button>

      {/* "Ver más" — control separado, fuera del botón de selección */}
      {hasLongDesc && (
        <div className="px-4 pb-2 pl-27">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="py-1 text-xs font-medium text-primary"
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

      <div className="space-y-2">
        {services.map((svc) => (
          <ServiceSelectCard
            key={svc.id}
            svc={svc}
            selected={selectedIds.includes(svc.id)}
            onToggle={onToggle}
          />
        ))}
      </div>

      {/* Resumen + avanzar */}
      <div className="sticky bottom-0 space-y-2 border-t border-border bg-background/95 pt-3 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {count === 0 ? 'Sin servicios seleccionados' : `${count} ${count === 1 ? 'servicio' : 'servicios'}`}
          </span>
          {count > 0 && (
            <span className="font-semibold">
              Total: {formatCop(totalPriceCop)} · {formatDuration(totalDurationMin)}
            </span>
          )}
        </div>
        <Button className="w-full" onClick={onContinue} disabled={count === 0}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
