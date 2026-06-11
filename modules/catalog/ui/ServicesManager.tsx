'use client'
import Image from 'next/image'
import { useOptimistic, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button }     from '@/shared/ui/button'
import { Input }      from '@/shared/ui/input'
import { Label }      from '@/shared/ui/label'
import { Textarea }   from '@/shared/ui/textarea'
import { Badge }      from '@/shared/ui/badge'
import { cn }         from '@/shared/ui/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { formatCop, formatDuration } from '@/shared/format'
import { upsertServiceAction, toggleServiceAction, reorderServiceAction } from '../actions'
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
  // useOptimistic recibe `initial` directamente desde el Server Component.
  // Cuando revalidatePath() dispara un re-render del RSC, `initial` cambia y
  // useOptimistic lo recoge automáticamente — sin useState que lo bloquee.
  const [optimistic, setOptimistic] = useOptimistic(initial, applyOptimistic)
  const [isPending,  startTransition] = useTransition()
  const [togglingId, setTogglingId]  = useState<string | null>(null)
  const [showForm,   setShowForm]    = useState(false)
  const [editing,    setEditing]     = useState<ServiceDTO | null>(null)

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit   = (s: ServiceDTO) => { setEditing(s); setShowForm(true) }
  const close      = () => { setShowForm(false); setEditing(null) }

  function toggle(id: string, active: boolean) {
    setTogglingId(id)
    startTransition(async () => {
      setOptimistic({ type: 'toggle', id, active })
      const res = await toggleServiceAction(tenantSlug, id, active)
      setTogglingId(null)
      if (res && !res.ok) toast.error(res.error ?? 'No se pudo cambiar el estado.')
    })
  }

  function reorder(id: string, direction: 'up' | 'down') {
    startTransition(async () => {
      setOptimistic({ type: 'reorder', id, direction })
      const res = await reorderServiceAction(tenantSlug, id, direction)
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
            isToggling={togglingId === svc.id}
            isPendingReorder={isPending && togglingId === null}
            onToggle={() => toggle(svc.id, !svc.active)}
            onEdit={() => openEdit(svc)}
            onMoveUp={idx > 0 ? () => reorder(svc.id, 'up') : undefined}
            onMoveDown={idx < optimistic.length - 1 ? () => reorder(svc.id, 'down') : undefined}
          />
        ))}
      </div>
      )}
    </div>
  )
}

interface RowProps {
  service:          ServiceDTO
  isToggling:       boolean
  isPendingReorder: boolean
  onToggle:         () => void
  onEdit:           () => void
  onMoveUp?:        () => void
  onMoveDown?:      () => void
}

function ServiceRow({ service, isToggling, isPendingReorder, onToggle, onEdit, onMoveUp, onMoveDown }: RowProps) {
  return (
    <div className={cn(
      'flex items-center gap-4 bg-card px-5 py-3.5 transition-smooth',
      !service.active && 'opacity-50',
      isPendingReorder && 'opacity-70',
    )}>
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
        <div className="flex items-center gap-2">
          <p className="font-medium">{service.name}</p>
          <Badge variant="secondary" className="text-[10px]">{service.category}</Badge>
          {!service.active && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
        </div>
        {service.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{service.description}</p>
        )}
      </div>
      <div className="shrink-0 text-right text-sm">
        <p className="font-bold text-primary">{formatCop(service.priceCop)}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(service.durationMin)}</p>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex flex-col">
          <button onClick={onMoveUp} disabled={!onMoveUp || isPendingReorder} title="Subir"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={!onMoveDown || isPendingReorder} title="Bajar"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <button onClick={onEdit} title="Editar"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onToggle} disabled={isToggling} title={service.active ? 'Desactivar' : 'Activar'}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth">
          {isToggling
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
  const [isPending, setIsPending] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    try {
      await upsertServiceAction(tenantSlug, service?.id ?? null, fd)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="mb-4 font-semibold">{service ? 'Editar servicio' : 'Nuevo servicio'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" name="name" defaultValue={service?.name} required />
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoría</Label>
            <select name="category" id="category" defaultValue={service?.category ?? 'corte'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
        <div className="space-y-1.5">
          <Label htmlFor="imageUrl">URL de imagen (opcional)</Label>
          <Input id="imageUrl" name="imageUrl" type="url"
            defaultValue={service?.imageUrl ?? ''} placeholder="https://…" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Guardar'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>
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
