'use client'
import { Star, User } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { cn } from '@/shared/ui/utils'
import type { BarberDTO } from '@/modules/staff/queries'

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
        {barbers.map((b) => (
          <button key={b.id} onClick={() => onSelect(b)} className="text-left">
            <Card className={cn(
              'cursor-pointer transition-smooth hover:border-primary/60',
              selectedId === b.id && 'border-primary bg-primary/5',
            )}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
                  {b.displayName.charAt(0)}
                </div>
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
