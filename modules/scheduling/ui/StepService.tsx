'use client'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
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
  services:   ServiceDTO[]
  selectedId: string | undefined
  onSelect:   (s: ServiceDTO) => void
}

export function StepService({ services, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {services.map((svc) => {
        const selected = selectedId === svc.id
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            className={cn(
              'w-full rounded-xl border px-4 py-3 text-left transition-smooth',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-accent/30',
            )}
          >
            <div className="flex items-center justify-between gap-3">
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
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    CATEGORY_COLOR[svc.category] ?? 'bg-muted text-muted-foreground',
                  )}>
                    {CATEGORY_LABELS[svc.category] ?? svc.category}
                  </span>
                  <span className="truncate font-medium">{svc.name}</span>
                </div>
                {svc.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{svc.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('font-bold', selected ? 'text-primary' : 'text-foreground')}>
                  {formatCop(svc.priceCop)}
                </p>
                <p className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(svc.durationMin)}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
