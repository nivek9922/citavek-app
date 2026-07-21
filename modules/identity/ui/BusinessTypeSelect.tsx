'use client'
import { Scissors, Sparkles, Check } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import type { BusinessType } from '@/shared/vocabulary'

/**
 * Único lugar del proyecto donde "Barbería" / "Salón de Belleza" van
 * hardcodeados: este selector es precisamente quien le pregunta al usuario
 * cuál de los dos quiere, así que ambas opciones deben mostrarse siempre,
 * sin depender del vocabulario activo (que todavía no existe en este punto
 * del registro).
 */
const OPTIONS: {
  value: BusinessType
  label: string
  description: string
  icon: typeof Scissors
}[] = [
  {
    value:       'BARBERSHOP',
    label:       'Barbería',
    description: 'Cortes, barba y arreglo masculino',
    icon:        Scissors,
  },
  {
    value:       'BEAUTY_SALON',
    label:       'Salón de Belleza',
    description: 'Manicure, maquillaje, cejas y más',
    icon:        Sparkles,
  },
]

interface Props {
  value:     BusinessType | ''
  onChange:  (value: BusinessType) => void
  disabled?: boolean
}

export function BusinessTypeSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-smooth disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40 hover:bg-accent/30',
            )}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-smooth',
              selected ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground',
            )}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        )
      })}
    </div>
  )
}
