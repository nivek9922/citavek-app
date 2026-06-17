'use client'
import { Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import type { BookingStep } from './useBookingFlow'

const STEPS = ['Servicio', 'Barbero', 'Fecha', 'Confirmar']

export function BookingProgress({ step }: { step: BookingStep }) {
  return (
    <div className="flex items-start gap-0">
      {STEPS.map((label, i) => {
        const num     = i + 1
        const done    = step > num
        const current = step === num
        return (
          <div key={label} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-smooth',
                done    ? 'bg-primary text-primary-foreground' :
                current ? 'bg-foreground text-background' :
                          'bg-card-soft text-ink-faint ring-1 ring-border',
              )}>
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : num}
              </div>
              <span className={cn(
                'text-[10px] leading-tight transition-smooth',
                current ? 'font-semibold text-foreground' :
                done    ? 'text-muted-foreground' :
                          'text-ink-faint',
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'mx-0.5 mt-3.5 h-px flex-1 transition-smooth',
                done ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
