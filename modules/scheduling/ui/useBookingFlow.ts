'use client'
import { useCallback, useMemo, useState } from 'react'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

export type BookingStep = 1 | 2 | 3 | 4 | 5

export interface BookingDraft {
  service?:      ServiceDTO
  barber?:       BarberDTO
  date?:         Date
  startAt?:      Date
  customerName:  string
  customerPhone: string
}

const initial: BookingDraft = { customerName: '', customerPhone: '' }

export function useBookingFlow() {
  const [step,  setStep]  = useState<BookingStep>(1)
  const [draft, setDraft] = useState<BookingDraft>(initial)

  const setService  = useCallback((service: ServiceDTO) => {
    setDraft((d) => ({ ...d, service }))
    setStep(2)
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

  const canConfirm = useMemo(() =>
    Boolean(
      draft.service &&
      draft.barber  &&
      draft.startAt &&
      draft.customerName.trim().length >= 2 &&
      /^\+57\d{10}$/.test(draft.customerPhone.replace(/\s/g, '')),
    ),
  [draft])

  return { step, draft, setService, setBarber, setDate, setStartAt, setCustomer, back, goTo, reset, canConfirm }
}
