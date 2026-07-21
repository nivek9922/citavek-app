'use client'
import { cn } from '@/shared/ui/utils'
import { useVocabulary } from '@/shared/ui/vocabulary-provider'

const BARBER_STEPS = ['Servicio', 'Fecha y hora', 'Confirmar']

/**
 * Indicador de progreso del wizard. El profesional salta el paso de selección
 * (se auto-asigna), así que ve 3 hitos en vez de 4.
 */
export function ManualAppointmentProgress({ step, isBarber }: { step: number; isBarber: boolean }) {
  const v = useVocabulary()
  const labels = isBarber
    ? BARBER_STEPS
    : ['Servicio', v.professionalSingular, 'Fecha y hora', 'Confirmar']
  // Mapea el step real (1..4) a la posición del indicador.
  const activeIndex = isBarber
    ? (step === 1 ? 0 : step === 3 ? 1 : 2)
    : step - 1

  return (
    <div className="flex items-center gap-0">
      {labels.map((label, i) => {
        const done    = activeIndex > i
        const current = activeIndex === i
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-smooth',
                done    ? 'bg-primary text-primary-foreground' :
                current ? 'border-2 border-primary text-primary' :
                          'border border-border text-muted-foreground',
              )}>
                {done ? '✓' : i + 1}
              </div>
              <span className={cn(
                'hidden text-[10px] sm:block',
                current ? 'font-medium text-primary' : 'text-muted-foreground',
              )}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={cn(
                'mx-1 mb-3 h-px flex-1 transition-smooth',
                done ? 'bg-primary' : 'bg-border',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
