'use client'
import { useCallback, useMemo, useState } from 'react'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

export type BookingStep = 1 | 2 | 3 | 4 | 5

export interface BookingDraft {
  services:      ServiceDTO[]
  barber?:       BarberDTO
  date?:         Date
  startAt?:      Date
  customerName:  string
  customerPhone: string
}

const initial: BookingDraft = { services: [], customerName: '', customerPhone: '' }

export function useBookingFlow() {
  const [step,  setStep]  = useState<BookingStep>(1)
  const [draft, setDraft] = useState<BookingDraft>(initial)

  // Multi-selección: alterna un servicio dentro/fuera. NO auto-avanza (el avance
  // al paso 2 lo dispara el botón "Siguiente"). Cambiar la selección invalida el
  // slot elegido (la duración total cambió) → se limpia startAt.
  const toggleService = useCallback((service: ServiceDTO) => {
    setDraft((d) => {
      const exists = d.services.some((s) => s.id === service.id)
      const services = exists
        ? d.services.filter((s) => s.id !== service.id)
        : [...d.services, service]
      return { ...d, services, startAt: undefined }
    })
  }, [])

  const goToBarber = useCallback(() => {
    setDraft((d) => {
      if (d.services.length >= 1) setStep(2)
      return d
    })
  }, [])

  const setBarber   = useCallback((barber: BarberDTO) => {
    setDraft((d) => ({ ...d, barber }))
    setStep(3)
  }, [])

  const setDate     = useCallback((date: Date) => {
    setDraft((d) => ({ ...d, date, startAt: undefined }))
  }, [])

  const setStartAt  = useCallback((startAt: Date) => {
    setDraft((d) => ({ ...d, startAt }))
    setStep(4)
  }, [])

  const setCustomer = useCallback((name: string, phone: string) => {
    setDraft((d) => ({ ...d, customerName: name, customerPhone: phone }))
  }, [])

  const back  = useCallback(() => setStep((s) => (s > 1 ? (s - 1) as BookingStep : s)), [])
  const goTo  = useCallback((s: BookingStep) => setStep(s), [])
  const reset = useCallback(() => { setDraft(initial); setStep(1) }, [])

  const totalPriceCop    = useMemo(() => draft.services.reduce((sum, s) => sum + s.priceCop, 0),    [draft.services])
  const totalDurationMin = useMemo(() => draft.services.reduce((sum, s) => sum + s.durationMin, 0), [draft.services])

  const canConfirm = useMemo(() =>
    Boolean(
      draft.services.length >= 1 &&
      draft.barber  &&
      draft.startAt &&
      draft.customerName.trim().length >= 2 &&
      /^\+\d{7,15}$/.test(draft.customerPhone.replace(/\s/g, '')),
    ),
  [draft])

  return {
    step, draft, totalPriceCop, totalDurationMin,
    toggleService, goToBarber, setBarber, setDate, setStartAt, setCustomer,
    back, goTo, reset, canConfirm,
  }
}
