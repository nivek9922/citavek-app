'use client'
import { useState, useTransition } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Button }    from '@/shared/ui/button'
import { Input }     from '@/shared/ui/input'
import { Label }     from '@/shared/ui/label'
import { Textarea }  from '@/shared/ui/textarea'
import { Badge }     from '@/shared/ui/badge'
import { cn }        from '@/shared/ui/utils'
import { formatCop, formatDuration } from '@/shared/format'
import { upsertServiceAction, toggleServiceAction } from '../actions'
import type { ServiceDTO } from '../queries'

const CATEGORIES = [
  { value: 'corte',       label: 'Corte' },
  { value: 'barba',       label: 'Barba' },
  { value: 'combo',       label: 'Combo' },
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'infantil',    label: 'Infantil' },
]

interface Props {
  services:   ServiceDTO[]
  tenantSlug: string
}

export function ServicesManager({ services, tenantSlug }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<ServiceDTO | null>(null)

  const openCreate = () => { setEditing(null); setShowForm(true) }
  const openEdit   = (s: ServiceDTO) => { setEditing(s); setShowForm(true) }
  const close      = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide">Servicios</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Añadir servicio
        </Button>
      </div>

      {/* Formulario create/edit */}
      {showForm && (
        <ServiceForm
          tenantSlug={tenantSlug}
          service={editing}
          onDone={close}
        />
      )}

      {/* Lista */}
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {services.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin servicios. Añade el primero.
          </p>
        )}
        {services.map((svc) => (
          <ServiceRow
            key={svc.id}
            service={svc}
            tenantSlug={tenantSlug}
            onEdit={() => openEdit(svc)}
          />
        ))}
      </div>
    </div>
  )
}

function ServiceRow({
  service, tenantSlug, onEdit,
}: { service: ServiceDTO; tenantSlug: string; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(() => toggleServiceAction(tenantSlug, service.id, !service.active))

  return (
    <div className={cn(
      'flex items-center gap-4 bg-card px-5 py-3.5 transition-smooth',
      !service.active && 'opacity-50',
    )}>
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
        <button onClick={onEdit} title="Editar"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={toggle} disabled={isPending} title={service.active ? 'Desactivar' : 'Activar'}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth">
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
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await upsertServiceAction(tenantSlug, service?.id ?? null, fd)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
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
