'use client'
import { cn } from '@/shared/ui/utils'
import type { BookingStep } from './useBookingFlow'

const STEPS = ['Servicio', 'Barbero', 'Fecha y hora', 'Confirmar']

export function BookingProgress({ step }: { step: BookingStep }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const num     = i + 1
        const done    = step > num
        const current = step === num
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-smooth',
                done    ? 'bg-primary text-primary-foreground' :
                current ? 'border-2 border-primary text-primary' :
                          'border border-border text-muted-foreground',
              )}>
                {done ? '✓' : num}
              </div>
              <span className={cn(
                'hidden text-[10px] sm:block',
                current ? 'text-primary font-medium' : 'text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'mb-3 h-px flex-1 mx-1 transition-smooth',
                done ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
