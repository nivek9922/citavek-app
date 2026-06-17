'use client'
import Image from 'next/image'
import { Star, User, Shuffle, Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { ANY_BARBER_ID } from '@/modules/scheduling/domain/any-barber'
import type { BarberDTO } from '@/modules/staff/queries'

export const ANY_BARBER: BarberDTO = {
  id: ANY_BARBER_ID,
  displayName: 'Sin preferencia',
  nickname: null,
  avatarUrl: null,
  specialties: [],
  rating: 0,
  reviewsCount: 0,
}

interface Props {
  barbers:    BarberDTO[]
  selectedId: string | undefined
  onSelect:   (b: BarberDTO) => void
}

/** Indicador circular de selección, consistente con las cards de servicio. */
function Selector({ selected }: { selected: boolean }) {
  return (
    <span className={cn(
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-smooth',
      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
    )}>
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  )
}

const cardClass = (selected: boolean) => cn(
  'sf-hover-lift flex min-h-16 w-full items-center gap-3.5 rounded-2xl border-[1.5px] p-3.5 text-left transition-smooth',
  selected
    ? 'border-primary bg-(--bg-selected) shadow-sf-selected'
    : 'border-border bg-card-soft shadow-sf-card hover:border-primary/30',
)

export function StepBarber({ barbers, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Elige tu barbero</h3>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {/* Tarjeta especial: el primero disponible */}
        <button
          type="button"
          aria-pressed={selectedId === ANY_BARBER_ID}
          onClick={() => onSelect(ANY_BARBER)}
          className={cn(cardClass(selectedId === ANY_BARBER_ID), 'sm:col-span-2')}
        >
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-primary/12">
            <Shuffle className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">El primero disponible</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Asignamos al barbero con más disponibilidad</p>
          </div>
          <Selector selected={selectedId === ANY_BARBER_ID} />
        </button>

        {barbers.map((b, i) => {
          const selected = selectedId === b.id
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(b)}
              className={cardClass(selected)}
            >
              {b.avatarUrl ? (
                <Image
                  src={b.avatarUrl}
                  alt={b.displayName}
                  width={52} height={52}
                  unoptimized
                  priority={i === 0}
                  className="h-13 w-13 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
                  {b.displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">
                  {b.nickname
                    ? `${b.displayName.split(' ')[0]} "${b.nickname}"`
                    : b.displayName.split(' ').slice(0, 2).join(' ')}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="font-medium text-foreground">{b.rating.toFixed(1)}</span>
                  <span>· {b.reviewsCount} reseñas</span>
                </div>
                {b.specialties.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {b.specialties.slice(0, 2).map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Selector selected={selected} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
