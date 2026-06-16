'use client'
import Image from 'next/image'
import { useOptimistic, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, ChevronUp, ChevronDown, ImagePlus, X } from 'lucide-react'
import { Button }     from '@/shared/ui/button'
import { Input }      from '@/shared/ui/input'
import { Label }      from '@/shared/ui/label'
import { Textarea }   from '@/shared/ui/textarea'
import { Badge }      from '@/shared/ui/badge'
import { cn }         from '@/shared/ui/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { formatCop, formatDuration } from '@/shared/format'
import { upsertServiceAction, toggleServiceAction, setServiceOrderAction, uploadServiceImageAction } from '../actions'
import type { ServiceDTO } from '../queries'

const CATEGORIES = [
  { value: 'corte',       label: 'Corte' },
  { value: 'barba',       label: 'Barba' },
  { value: 'combo',       label: 'Combo' },
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'infantil',    label: 'Infantil' },
]

type OptAction =
  | { type: 'toggle';  id: string; active: boolean }
  | { type: 'reorder'; id: string; direction: 'up' | 'down' }

function applyOptimistic(state: ServiceDTO[], action: OptAction): ServiceDTO[] {
  if (action.type === 'toggle') {
    return state.map((s) => s.id === action.id ? { ...s, active: action.active } : s)
  }
  if (action.type === 'reorder') {
    const idx     = state.findIndex((s) => s.id === action.id)
    const swapIdx = action.direction === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || swapIdx < 0 || swapIdx >= state.length) return state
    // Intercambiar POSICIONES, no valores de sortOrder: con sortOrders
    // duplicados (datos legados) el swap de valores era un no-op visual.
    const next = [...state]
    ;[next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!]
    return next
  }
  return state
}

interface Props {
  services:   ServiceDTO[]
  tenantSlug: string
}

export function ServicesManager({ services: initial, tenantSlug }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(initial, applyOptimistic)
  const [, startTransition] = useTransition()
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map())
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<ServiceDTO | null>(null)

  const isPendingItem = (id: string) => (pendingCounts.get(id) ?? 0) > 0

  function addPending(id: string) {
    setPendingCounts(prev => new Map(prev).set(id, (prev.get(id) ?? 0) + 1))
  }
  function removePending(id: string) {
    setPendingCounts(prev => {
      const m = new Map(prev)
      const n = (m.get(id) ?? 1) - 1
      if (n <= 0) m.delete(id); else m.set(id, n)
      return m
    })
  }

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit   = (s: ServiceDTO) => { setEditing(s); setShowForm(true) }
  const close      = () => { setShowForm(false); setEditing(null) }

  function toggle(id: string, active: boolean) {
    addPending(id)
    startTransition(async () => {
      setOptimistic({ type: 'toggle', id, active })
      const res = await toggleServiceAction(tenantSlug, id, active)
      removePending(id)
      if (!res.ok) toast.error(res.error ?? 'No se pudo cambiar el estado.')
    })
  }

  function reorder(id: string, direction: 'up' | 'down') {
    const orderedIds = applyOptimistic(optimistic, { type: 'reorder', id, direction }).map(s => s.id)
    addPending(id)
    startTransition(async () => {
      setOptimistic({ type: 'reorder', id, direction })
      const res = await setServiceOrderAction(tenantSlug, orderedIds)
      removePending(id)
      if (!res.ok) toast.error(res.error ?? 'No se pudo reordenar.')
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide">Servicios</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Añadir servicio
        </Button>
      </div>

      {showForm && (
        <ServiceForm
          tenantSlug={tenantSlug}
          service={editing}
          onDone={close}
        />
      )}

      {optimistic.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Tu catálogo de servicios está vacío"
          description="Crea tu carta con precios y duración real. Tus clientes la ven al reservar — sin servicios, la agenda no puede abrirse."
          action={<Button size="sm" onClick={openCreate}>Crear primer servicio</Button>}
        />
      ) : (
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {optimistic.map((svc, idx) => (
          <ServiceRow
            key={svc.id}
            service={svc}
            isPending={isPendingItem(svc.id)}
            onToggle={() => toggle(svc.id, !svc.active)}
            onEdit={() => openEdit(svc)}
            onMoveUp={idx > 0 ? () => reorder(svc.id, 'up') : undefined}
            onMoveDown={idx < optimistic.length - 1 ? () => reorder(svc.id, 'down') : undefined}
          />
        ))}
      </div>
      )}

      {/* FAB móvil — alta de servicio siempre alcanzable al hacer scroll */}
      <button
        type="button"
        onClick={openCreate}
        aria-label="Añadir servicio"
        className="fixed bottom-6 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-smooth hover:bg-primary/90 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}

interface RowProps {
  service:    ServiceDTO
  isPending:  boolean
  onToggle:   () => void
  onEdit:     () => void
  onMoveUp?:  () => void
  onMoveDown?: () => void
}

function ServiceRow({ service, isPending, onToggle, onEdit, onMoveUp, onMoveDown }: RowProps) {
  return (
    <div className={cn(
      'flex flex-col gap-2 bg-card px-4 py-3 transition-smooth sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3.5',
      !service.active && 'opacity-50',
    )}>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.name}
            width={40} height={40}
            unoptimized
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-lg">
            {service.category === 'corte' ? '✂️' : service.category === 'barba' ? '🪒' : service.category === 'combo' ? '💈' : service.category === 'tratamiento' ? '✨' : '👦'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium wrap-break-word">{service.name}</p>
            <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>
            {!service.active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
          </div>
          {service.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{service.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right text-sm">
          <p className="font-bold text-primary">{formatCop(service.priceCop)}</p>
          <p className="text-xs text-muted-foreground">{formatDuration(service.durationMin)}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-border pt-2 sm:border-0 sm:pt-0">
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={!onMoveUp || isPending} title="Subir"
            className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth disabled:opacity-30 disabled:cursor-not-allowed sm:p-0.5">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={!onMoveDown || isPending} title="Bajar"
            className="rounded p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth disabled:opacity-30 disabled:cursor-not-allowed sm:p-0.5">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <button onClick={onEdit} title="Editar"
          className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth sm:p-1.5">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onToggle} disabled={isPending} title={service.active ? 'Desactivar' : 'Activar'}
          className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth sm:p-1.5">
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : service.active
              ? <ToggleRight className="h-5 w-5 text-primary" />
              : <ToggleLeft  className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

function ServiceForm({
  tenantSlug, service, onDone,
}: { tenantSlug: string; service: ServiceDTO | null; onDone: () => void }) {
  const [isPending,   setIsPending]   = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl,    setImageUrl]    = useState<string | null>(service?.imageUrl ?? null)
  const [error,       setError]       = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadServiceImageAction(tenantSlug, fd, imageUrl)
    setIsUploading(false)
    if (res.ok) {
      setImageUrl(res.url)
    } else {
      toast.error(res.error ?? 'No se pudo subir la imagen.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    // Asegura que imageUrl del estado (subida eager) sobreescriba cualquier valor del form
    fd.set('imageUrl', imageUrl ?? '')
    const res = await upsertServiceAction(tenantSlug, service?.id ?? null, fd)
    setIsPending(false)
    if (res.ok) {
      toast.success(service ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente')
      onDone()
    } else {
      const msg = res.error ?? 'No se pudo guardar el servicio.'
      toast.error(msg)
      setError(msg)
    }
  }

  const isBusy = isPending || isUploading

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="mb-4 font-semibold">{service ? 'Editar servicio' : 'Nuevo servicio'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" name="name" defaultValue={service?.name} required />
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoría</Label>
            <select name="category" id="category" defaultValue={service?.category ?? 'corte'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <FormField label="Duración (minutos)" name="durationMin" type="number"
            defaultValue={service?.durationMin} min={5} max={480} required />
          <FormField label="Precio (COP)" name="priceCop" type="number"
            defaultValue={service?.priceCop} min={0} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea id="description" name="description" rows={2} maxLength={300}
            defaultValue={service?.description ?? ''} />
        </div>

        {/* ── Imagen del servicio ── */}
        <div className="space-y-2">
          <Label>Imagen del servicio (opcional)</Label>
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <Image
                src={imageUrl}
                alt="Vista previa"
                width={64} height={64}
                unoptimized
                className="h-16 w-16 rounded-lg object-cover border border-border"
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  disabled={isBusy}
                >
                  <X className="h-3.5 w-3.5" /> Quitar imagen
                </Button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cambiar imagen
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50',
              )}
            >
              {isUploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo imagen…</>
                : <><ImagePlus className="h-4 w-4" /> Subir imagen</>}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isBusy}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isBusy} size="sm">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={isBusy}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

function FormField({
  label, name, type = 'text', defaultValue, required, min, max,
}: {
  label: string; name: string; type?: string
  defaultValue?: string | number | null; required?: boolean
  min?: number; max?: number
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type}
        defaultValue={defaultValue ?? ''} required={required}
        min={min} max={max} />
    </div>
  )
}
