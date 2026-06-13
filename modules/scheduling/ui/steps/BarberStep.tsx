'use client'
import Image from 'next/image'
import { cn } from '@/shared/ui/utils'
import type { BarberDTO } from '@/modules/staff/queries'

interface Props {
  barbers:    BarberDTO[]
  selectedId: string | undefined
  onSelect:   (b: BarberDTO) => void
}

/**
 * Paso 2 — elegir el barbero (solo lo ve el owner).
 * No incluye "sin preferencia": el alta manual exige un barbero concreto y el
 * Server Action no resuelve el sentinel ANY_BARBER en este flujo.
 */
export function BarberStep({ barbers, selectedId, onSelect }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {barbers.map((b, i) => {
        const selected = selectedId === b.id
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 text-left transition-smooth',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-accent/30',
            )}
          >
            {b.avatarUrl ? (
              <Image
                src={b.avatarUrl}
                alt={b.displayName}
                width={44} height={44}
                unoptimized
                priority={i === 0}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
                {b.displayName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">
                {b.nickname
                  ? `${b.displayName.split(' ')[0]} "${b.nickname}"`
                  : b.displayName.split(' ').slice(0, 2).join(' ')}
              </p>
              {b.specialties.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {b.specialties.slice(0, 2).join(' · ')}
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
