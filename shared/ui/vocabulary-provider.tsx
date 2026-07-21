'use client'
import { createContext, useContext, useMemo } from 'react'
import {
  getVocabulary,
  DEFAULT_BUSINESS_TYPE,
  type BusinessType,
  type Vocabulary,
} from '@/shared/vocabulary'

/**
 * Publica el vocabulario del tenant a los client components.
 *
 * Existe porque todo el texto visible con terminología variable vive en
 * componentes 'use client' (BookingFlow, BarbersManager, OnboardingWizard…), que
 * no pueden llamar `getTenantContext`. El contexto evita reenviar `vocab` por
 * ~10 firmas de props.
 *
 * Montado en:
 *   - app/[tenant]/panel/layout.tsx  → todo el panel
 *   - app/[tenant]/page.tsx          → el flujo de reserva del storefront
 *
 * Los server components NO usan esto: llaman `getVocabulary(ctx.businessType)`.
 */
const VocabularyContext = createContext<Vocabulary>(getVocabulary(DEFAULT_BUSINESS_TYPE))

export function VocabularyProvider({
  businessType,
  children,
}: {
  businessType: BusinessType
  children: React.ReactNode
}) {
  const vocabulary = useMemo(() => getVocabulary(businessType), [businessType])
  return <VocabularyContext value={vocabulary}>{children}</VocabularyContext>
}

/**
 * Fuera del árbol de un tenant devuelve el vocabulario de barbería en vez de
 * lanzar: ningún componente debe romperse por renderizarse sin provider.
 */
export function useVocabulary(): Vocabulary {
  return useContext(VocabularyContext)
}
