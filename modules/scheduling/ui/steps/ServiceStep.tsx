'use client'
import Image from 'next/image'
import { Clock } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { formatCop, formatDuration } from '@/shared/format'
import type { ServiceDTO } from '@/modules/catalog/queries'

const CATEGORY_EMOJI: Record<string, string> = {
  corte: '✂️', barba: '🪒', combo: '💈', tratamiento: '✨', infantil: '👦',
}

interface Props {
  services:   ServiceDTO[]
  selectedId: string | undefined
  onSelect:   (s: ServiceDTO) => void
}

/** Paso 1 — elegir el servicio. Selección avanza el wizard (la maneja el padre). */
export function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {services.map((svc) => {
        const selected = selectedId === svc.id
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => onSelect(svc)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-smooth',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-accent/30',
            )}
          >
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
            <p className={cn('shrink-0 font-bold', selected ? 'text-primary' : 'text-foreground')}>
              {formatCop(svc.priceCop)}
            </p>
          </button>
        )
      })}
    </div>
  )
}
