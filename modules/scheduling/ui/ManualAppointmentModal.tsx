'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, ArrowLeft } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/ui/utils'
import { useVocabulary } from '@/shared/ui/vocabulary-provider'
import { createManualAppointmentAction } from '../actions'
import { ManualAppointmentProgress } from './ManualAppointmentProgress'
import { ServiceStep } from './steps/ServiceStep'
import { BarberStep }  from './steps/BarberStep'
import { SlotStep }    from './steps/SlotStep'
import { ClientStep, type ManualCustomer } from './steps/ClientStep'
import type { ServiceDTO } from '@/modules/catalog/queries'
import type { BarberDTO }  from '@/modules/staff/queries'

type Step = 1 | 2 | 3 | 4

interface Selection {
  services: ServiceDTO[]
  barber?:  BarberDTO
  startAt?: Date
}

interface Props {
  tenantSlug:       string
  services:         ServiceDTO[]
  barbers:          BarberDTO[]
  todayStr:         string  // YYYY-MM-DD en TZ del tenant (mínimo seleccionable)
  timezone:         string
  currentBarberId?: string  // si el usuario es barbero: su propio barberId
}

/**
 * Alta manual de cita desde el panel. Mismo flujo y mismo motor de slots que el
 * booking público: servicio → barbero → fecha/hora → cliente. Solo dos piezas de
 * estado de selección; el resto son queries al servidor (slots) o estado de UI.
 */
export function ManualAppointmentModal({
  tenantSlug, services, barbers, todayStr, timezone, currentBarberId,
}: Props) {
  const v = useVocabulary()
  const [open,      setOpen]      = useState(false)
  const [step,      setStep]      = useState<Step>(1)
  const [selection, setSelection] = useState<Selection>({ services: [] })
  const [isPending, startTransition] = useTransition()

  const isBarber  = !!currentBarberId
  const ownBarber = currentBarberId ? barbers.find((b) => b.id === currentBarberId) : undefined

  function reset() {
    setStep(1)
    setSelection({ services: [] })
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  // Multi-selección: alterna un servicio. Cambiar la selección invalida el slot
  // elegido (la duración total cambió) → se limpia startAt.
  function toggleService(service: ServiceDTO) {
    setSelection((s) => {
      const exists = s.services.some((x) => x.id === service.id)
      const services = exists
        ? s.services.filter((x) => x.id !== service.id)
        : [...s.services, service]
      return { ...s, services, startAt: undefined }
    })
  }

  function continueFromServices() {
    if (selection.services.length === 0) return
    // El barbero se auto-asigna y salta el paso 2.
    if (isBarber && ownBarber) {
      setSelection((s) => ({ ...s, barber: ownBarber }))
      setStep(3)
    } else {
      setStep(2)
    }
  }

  function selectBarber(barber: BarberDTO) {
    setSelection((s) => ({ ...s, barber }))
    setStep(3)
  }

  function selectSlot(startAt: Date) {
    setSelection((s) => ({ ...s, startAt }))
    setStep(4)
  }

  function back() {
    setStep((s) => {
      if (s === 4) return 3
      if (s === 3) return isBarber ? 1 : 2 // el barbero no tiene paso "Barbero"
      return 1
    })
  }

  function handleConfirm(customer: ManualCustomer) {
    const { services, barber, startAt } = selection
    if (services.length === 0 || !barber || !startAt) return
    startTransition(async () => {
      const res = await createManualAppointmentAction(tenantSlug, {
        serviceIds:    services.map((s) => s.id),
        barberId:      barber.id,
        startAtISO:    startAt.toISOString(),
        customerName:  customer.name,
        customerPhone: customer.phone,
        notes:         customer.notes.trim() || undefined,
      })
      if (res.ok) {
        toast.success('Cita creada correctamente.')
        handleOpenChange(false)
      } else {
        toast.error(res.error)
      }
    })
  }

  const disabled = services.length === 0 || barbers.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}
          title={disabled ? `Necesitas al menos un servicio y un ${v.professionalSingularLower}` : undefined}>
          <Plus className="h-4 w-4" /> Nueva cita
        </Button>
      </DialogTrigger>

      <DialogContent className={cn(
        'max-h-[90vh] overflow-y-auto',
        '[&::-webkit-scrollbar]:w-1.5',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb]:bg-border',
      )}>
        <DialogHeader>
          <DialogTitle>Nueva cita manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ManualAppointmentProgress step={step} isBarber={isBarber} />

          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={back} className="-ml-1 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
          )}

          {step === 1 && (
            <ServiceStep
              services={services}
              selectedIds={selection.services.map((s) => s.id)}
              onToggle={toggleService}
              onContinue={continueFromServices}
            />
          )}

          {step === 2 && (
            <BarberStep
              barbers={barbers}
              selectedId={selection.barber?.id}
              onSelect={selectBarber}
            />
          )}

          {step === 3 && selection.services.length > 0 && selection.barber && (
            // key = barbero + servicios → SlotStep se remonta limpio si cambian.
            <SlotStep
              key={`${selection.barber.id}-${selection.services.map((s) => s.id).join(',')}`}
              tenantSlug={tenantSlug}
              barber={selection.barber}
              serviceIds={selection.services.map((s) => s.id)}
              selectedAt={selection.startAt}
              onSelect={selectSlot}
              timezone={timezone}
              todayStr={todayStr}
            />
          )}

          {step === 4 && selection.services.length > 0 && selection.barber && selection.startAt && (
            <ClientStep
              services={selection.services}
              barber={selection.barber}
              startAt={selection.startAt}
              timezone={timezone}
              isPending={isPending}
              onConfirm={handleConfirm}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
