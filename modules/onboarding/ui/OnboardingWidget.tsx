'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { dismissOnboardingAction } from '@/modules/onboarding/actions'
import { useVocabulary } from '@/shared/ui/vocabulary-provider'

export interface OnboardingStep {
  label: string
  description: string
  completed: boolean
  href: string
  linkText: string
}

export function OnboardingWidget({ steps, slug }: { steps: OnboardingStep[]; slug: string }) {
  const v = useVocabulary()
  const [isPending, startTransition] = useTransition()
  const completedCount = steps.filter((s) => s.completed).length
  const nextStepIdx    = steps.findIndex((s) => !s.completed)

  const HEADLINES: Record<number, string> = {
    0: `Tu ${v.businessNoun} está a 3 pasos de su primera reserva`,
    1: '¡Buen inicio! Sigamos — quedan 2 pasos',
    2: 'Casi listo — un último paso y tu agenda se abre',
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissOnboardingAction(slug)
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
      {/* Headline */}
      <p className="text-sm font-medium">
        {HEADLINES[completedCount] ?? `Configura tu ${v.businessNoun}`}
      </p>

      {/* Steps */}
      <ol className="space-y-2">
        {steps.map((step, idx) => {
          if (step.completed) {
            return (
              <li key={step.label} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-sm text-muted-foreground line-through">{step.label}</span>
              </li>
            )
          }

          if (idx === nextStepIdx) {
            return (
              <li key={step.label} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  <Link
                    href={`/${slug}/panel/${step.href}`}
                    className="shrink-0 text-xs font-medium text-primary transition-smooth hover:underline"
                  >
                    {step.linkText} →
                  </Link>
                </div>
                <p className="pl-7 text-xs text-muted-foreground">{step.description}</p>
              </li>
            )
          }

          return (
            <li key={step.label} className="flex items-center gap-3">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
                {idx + 1}
              </span>
              <span className="text-sm text-muted-foreground">{step.label}</span>
            </li>
          )
        })}
      </ol>

      {/* Footer: progress + dismiss */}
      <div className="flex items-center gap-3">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round((completedCount / steps.length) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {completedCount} de {steps.length}
        </span>
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="shrink-0 text-[11px] text-muted-foreground transition-smooth hover:text-foreground disabled:opacity-50"
        >
          Ya lo exploré solo ×
        </button>
      </div>
    </div>
  )
}

export function OnboardingSuccessStrip({ slug }: { slug: string }) {
  const v = useVocabulary()

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
    toast.success('Link copiado al portapapeles')
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-5 py-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="text-sm">{v.businessReadyPhrase} para recibir citas.</span>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs font-medium text-primary transition-smooth hover:underline"
      >
        <Link2 className="h-3 w-3" />
        Copiar link de reservas
      </button>
    </div>
  )
}
