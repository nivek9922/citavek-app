'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/shared/ui/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'
import { updateBrandingAction, uploadTenantLogoAction, uploadTenantCoverAction } from '@/modules/tenancy/actions'
import { upsertBarberAction } from '@/modules/staff/actions'
import { upsertServiceAction } from '@/modules/catalog/actions'
import { markWizardSeenAction } from '@/modules/onboarding/actions'

const PALETTE = ['#E0A300', '#22C55E', '#F43F5E', '#3B82F6', '#A855F7', '#06B6D4', '#F97316', '#1A1A1A']

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const CATEGORIES = [
  { value: 'corte',       label: 'Corte' },
  { value: 'barba',       label: 'Barba' },
  { value: 'combo',       label: 'Combo' },
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'infantil',    label: 'Infantil' },
]

function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

interface Props {
  slug:            string
  initialColor:    string
  initialLogoUrl:  string | null
  initialCoverUrl: string | null
}

export function OnboardingWizard({ slug, initialColor, initialLogoUrl, initialCoverUrl }: Props) {
  const [open, setOpen] = useState(true)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [isPending, startTransition] = useTransition()

  // ── Paso 0: Marca ───────────────────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState(initialColor)
  const [logoPreview,   setLogoPreview]   = useState<string | null>(initialLogoUrl)
  const [coverPreview,  setCoverPreview]  = useState<string | null>(initialCoverUrl)
  const [brandSaved,    setBrandSaved]    = useState(false)

  // ── Paso 1: Equipo ──────────────────────────────────────────────────────────
  const [displayName,  setDisplayName]  = useState('')
  const [specialties,  setSpecialties]  = useState('')
  const [activeDays,   setActiveDays]   = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6]))
  const [startTime,    setStartTime]    = useState('09:00')
  const [endTime,      setEndTime]      = useState('18:00')
  const [barberSaved,  setBarberSaved]  = useState(false)

  // ── Paso 2: Servicios ───────────────────────────────────────────────────────
  const [serviceName,     setServiceName]     = useState('')
  const [serviceCategory, setServiceCategory] = useState('corte')
  const [durationMin,     setDurationMin]     = useState('')
  const [priceCop,        setPriceCop]        = useState('')
  const [serviceSaved,    setServiceSaved]    = useState(false)

  function handleClose() {
    setOpen(false)
    startTransition(() => markWizardSeenAction(slug))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast.error('El archivo supera los 4 MB.'); return }
    const fd = new FormData()
    fd.set('file', file)
    startTransition(async () => {
      const res = await uploadTenantLogoAction(slug, fd)
      if (res.ok) setLogoPreview(res.url)
      else toast.error(res.error)
    })
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast.error('El archivo supera los 4 MB.'); return }
    const fd = new FormData()
    fd.set('file', file)
    startTransition(async () => {
      const res = await uploadTenantCoverAction(slug, fd)
      if (res.ok) setCoverPreview(res.url)
      else toast.error(res.error)
    })
  }

  function saveBrand() {
    const fd = new FormData()
    fd.set('primaryColor', selectedColor)
    startTransition(async () => {
      try {
        await updateBrandingAction(slug, fd)
        setBrandSaved(true)
        setStep(1)
      } catch {
        toast.error('No se pudo guardar la marca. Intenta de nuevo.')
      }
    })
  }

  function saveBarber() {
    if (!displayName.trim()) { toast.error('El nombre del barbero es requerido.'); return }
    const fd = new FormData()
    fd.set('displayName', displayName.trim())
    if (specialties.trim()) fd.set('specialties', specialties.trim())
    const hoursJson = JSON.stringify(
      DAYS
        .filter((d) => activeDays.has(d.value))
        .map((d) => ({ dayOfWeek: d.value, startMin: timeToMin(startTime), endMin: timeToMin(endTime) }))
    )
    fd.set('hoursJson', hoursJson)
    startTransition(async () => {
      try {
        await upsertBarberAction(slug, null, fd)
        setBarberSaved(true)
        setStep(2)
      } catch {
        toast.error('No se pudo guardar el barbero. Intenta de nuevo.')
      }
    })
  }

  function saveService() {
    if (!serviceName.trim()) { toast.error('El nombre del servicio es requerido.'); return }
    if (!durationMin || !priceCop) { toast.error('Duración y precio son requeridos.'); return }
    const fd = new FormData()
    fd.set('name', serviceName.trim())
    fd.set('category', serviceCategory)
    fd.set('durationMin', durationMin)
    fd.set('priceCop', priceCop)
    startTransition(async () => {
      try {
        await upsertServiceAction(slug, null, fd)
        setServiceSaved(true)
        setStep(3)
      } catch {
        toast.error('No se pudo guardar el servicio. Intenta de nuevo.')
      }
    })
  }

  function toggleDay(value: number) {
    setActiveDays((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90dvh]">

        {/* Barra de progreso */}
        {step < 3 && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  i <= step ? 'bg-primary' : 'bg-border',
                )}
              />
            ))}
          </div>
        )}

        {/* ── Paso 0: Marca ─────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <DialogHeader>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Paso 1 de 3</p>
              <DialogTitle className="font-display text-xl tracking-wide">Ponle cara a tu negocio</DialogTitle>
              <DialogDescription>
                Tu logo y color son lo primero que ven tus clientes al entrar a reservar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Color de tu marca</Label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                        selectedColor === color ? 'border-foreground scale-110' : 'border-transparent',
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Logo */}
                <div className="space-y-1.5">
                  <Label>
                    Logo{' '}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Aparece en tu panel de administración.</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card/30 px-3 py-2.5 text-sm text-muted-foreground transition-smooth hover:border-primary/40 hover:text-foreground">
                    {logoPreview ? (
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
                        <Image src={logoPreview} alt="Logo" fill unoptimized className="object-contain" />
                      </div>
                    ) : (
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate text-xs">{logoPreview ? 'Logo cargado — cambiar' : 'Subir logo'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={isPending} />
                  </label>
                </div>

                {/* Banner */}
                <div className="space-y-1.5">
                  <Label>
                    Banner{' '}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Lo ven tus clientes en la página de reservas.</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card/30 px-3 py-2.5 text-sm text-muted-foreground transition-smooth hover:border-primary/40 hover:text-foreground">
                    {coverPreview ? (
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
                        <Image src={coverPreview} alt="Banner" fill unoptimized className="object-cover" />
                      </div>
                    ) : (
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate text-xs">{coverPreview ? 'Banner cargado — cambiar' : 'Subir banner'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} disabled={isPending} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="text-sm text-muted-foreground transition-smooth hover:text-foreground disabled:opacity-50"
              >
                Saltar →
              </button>
              <Button onClick={saveBrand} disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar y continuar →'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Paso 1: Equipo ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <DialogHeader>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Paso 2 de 3</p>
              <DialogTitle className="font-display text-xl tracking-wide">Presenta a tu equipo</DialogTitle>
              <DialogDescription>
                Tus clientes eligen con quién se van a cortar. Sin barberos, nadie puede reservar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre del barbero</Label>
                <Input
                  placeholder="Ej: Carlos Mendoza"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Especialidades{' '}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  placeholder="Ej: Corte clásico, Fade, Barba"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Separa con comas</p>
              </div>

              <div className="space-y-2">
                <Label>Días de trabajo</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-smooth',
                        activeDays.has(d.value)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-border/60',
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Desde</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>Hasta</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                El mismo horario se aplica a todos los días seleccionados. Puedes ajustarlo día por día en el panel de Equipo.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isPending}
                className="text-sm text-muted-foreground transition-smooth hover:text-foreground disabled:opacity-50"
              >
                Saltar →
              </button>
              <Button onClick={saveBarber} disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar y continuar →'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Servicios ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <DialogHeader>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Paso 3 de 3</p>
              <DialogTitle className="font-display text-xl tracking-wide">¿Qué ofreces?</DialogTitle>
              <DialogDescription>
                Sin servicios en tu carta, tu agenda no puede abrirse. Añade precios y duraciones reales.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre del servicio</Label>
                <Input
                  placeholder="Ej: Corte clásico de caballero"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Duración (min)</Label>
                  <Input
                    type="number"
                    placeholder="45"
                    min={5}
                    max={480}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>Precio (COP)</Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    min={0}
                    value={priceCop}
                    onChange={(e) => setPriceCop(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                La duración determina los slots disponibles en tu agenda.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={isPending}
                className="text-sm text-muted-foreground transition-smooth hover:text-foreground disabled:opacity-50"
              >
                Saltar →
              </button>
              <Button onClick={saveService} disabled={isPending}>
                {isPending ? 'Guardando…' : 'Guardar y continuar →'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Paso 3: ¡Listo! ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-display text-xl tracking-wide">¡Tu barbería está lista para despegar!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ya tienes lo esencial configurado. Puedes completar cualquier detalle desde tu panel.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4 text-left space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Lo que configuraste</p>
              <div className="space-y-2 text-sm">
                <SummaryRow label="Marca personalizada" done={brandSaved} />
                <SummaryRow label="Primer barbero registrado" done={barberSaved} />
                <SummaryRow label="Primer servicio creado" done={serviceSaved} />
              </div>
            </div>

            <Button className="w-full" onClick={handleClose} disabled={isPending}>
              {isPending ? 'Cargando…' : 'Ver mi agenda →'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0 text-center text-[10px] leading-3.5 text-muted-foreground">—</span>
      )}
      <span className={done ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
