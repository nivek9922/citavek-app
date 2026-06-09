'use client'
import Image from 'next/image'
import { Star, User, Shuffle } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
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

export function StepBarber({ barbers, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Elige tu barbero</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {/* Tarjeta especial: sin preferencia */}
        <button onClick={() => onSelect(ANY_BARBER)} className="text-left sm:col-span-2">
          <Card className={cn(
            'cursor-pointer transition-smooth hover:border-primary/60',
            selectedId === ANY_BARBER_ID && 'border-primary bg-primary/5',
          )}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                <Shuffle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">El primero disponible</p>
                <p className="text-xs text-muted-foreground">Asignamos al barbero con más disponibilidad</p>
              </div>
            </CardContent>
          </Card>
        </button>
        {barbers.map((b, i) => (
          <button key={b.id} onClick={() => onSelect(b)} className="text-left">
            <Card className={cn(
              'cursor-pointer transition-smooth hover:border-primary/60',
              selectedId === b.id && 'border-primary bg-primary/5',
            )}>
              <CardContent className="flex items-center gap-3 p-3">
                {b.avatarUrl ? (
                  <Image
                    src={b.avatarUrl}
                    alt={b.displayName}
                    width={48} height={48}
                    unoptimized
                    priority={i === 0}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
                    {b.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {b.nickname
                      ? `${b.displayName.split(' ')[0]} "${b.nickname}"`
                      : b.displayName.split(' ').slice(0, 2).join(' ')}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="font-medium text-foreground">{b.rating.toFixed(1)}</span>
                    <span>· {b.reviewsCount} reseñas</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {b.specialties.slice(0, 2).map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
