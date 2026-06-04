'use client'
import { useState, useTransition } from 'react'
import { Loader2, CheckCircle2, Palette, Store } from 'lucide-react'
import { Button }  from '@/shared/ui/button'
import { Input }   from '@/shared/ui/input'
import { Label }   from '@/shared/ui/label'
import { cn }      from '@/shared/ui/utils'
import { updateBrandingAction, updateOrgInfoAction } from '../actions'

const PALETTE = [
  '#E0A300', '#22C55E', '#F43F5E', '#3B82F6',
  '#A855F7', '#06B6D4', '#F97316', '#1A1A1A',
]

interface Props {
  tenantSlug: string
  org:        { name: string; city: string | null; address: string | null; phone: string | null }
  branding:   { primaryColor: string; logoUrl: string | null; tagline: string | null; coverUrl: string | null } | null
}

export function BrandingSettings({ tenantSlug, org, branding }: Props) {
  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl tracking-wide">Marca y configuración</h2>

      {/* Info básica */}
      <Section icon={<Store className="h-5 w-5 text-primary" />} title="Información básica">
        <InfoForm tenantSlug={tenantSlug} org={org} />
      </Section>

      {/* Branding */}
      <Section icon={<Palette className="h-5 w-5 text-primary" />} title="Identidad visual">
        <BrandForm tenantSlug={tenantSlug} branding={branding} />
      </Section>
    </div>
  )
}

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoForm({ tenantSlug, org }: { tenantSlug: string; org: Props['org'] }) {
  const [isPending, startTransition] = useTransition()
  const [saved,     setSaved]        = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateOrgInfoAction(tenantSlug, new FormData(e.currentTarget))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la barbería" name="name" defaultValue={org.name} required />
        <Field label="Ciudad"   name="city"    defaultValue={org.city    ?? ''} />
        <Field label="Dirección" name="address" defaultValue={org.address ?? ''} />
        <Field label="Teléfono / WhatsApp" name="phone" defaultValue={org.phone ?? ''} />
      </div>
      <SaveBtn isPending={isPending} saved={saved} />
    </form>
  )
}

function BrandForm({ tenantSlug, branding }: { tenantSlug: string; branding: Props['branding'] }) {
  const [color,     setColor]   = useState(branding?.primaryColor ?? '#E0A300')
  const [isPending, startTransition] = useTransition()
  const [saved,     setSaved]   = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    const fd = new FormData(e.currentTarget)
    fd.set('primaryColor', color)
    startTransition(async () => {
      await updateBrandingAction(tenantSlug, fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preview del color */}
      <div className="flex items-center gap-3 rounded-xl border border-border p-3">
        <div className="h-12 w-12 rounded-xl" style={{ backgroundColor: color }} />
        <div>
          <p className="text-sm font-medium" style={{ color }}>Vista previa del color</p>
          <p className="text-xs text-muted-foreground">Así se verá tu página pública</p>
        </div>
      </div>

      {/* Paleta */}
      <div className="space-y-2">
        <Label>Color principal</Label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={cn('h-9 w-9 rounded-xl border-2 transition-smooth',
                color.toLowerCase() === c.toLowerCase()
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105')}
              style={{ backgroundColor: c }} />
          ))}
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-xl border-2 border-border bg-transparent" />
            <Input value={color} onChange={(e) => setColor(e.target.value)}
              className="w-28 font-mono uppercase" maxLength={7} />
          </div>
        </div>
      </div>

      <Field label="Eslogan" name="tagline" defaultValue={branding?.tagline ?? ''}
        placeholder="El estilo del Valle, en tus manos." />
      <Field label="URL del logo (opcional)" name="logoUrl" type="url"
        defaultValue={branding?.logoUrl ?? ''} placeholder="https://..." />
      <Field label="URL imagen de portada (opcional)" name="coverUrl" type="url"
        defaultValue={branding?.coverUrl ?? ''} placeholder="https://..." />

      <SaveBtn isPending={isPending} saved={saved} />
    </form>
  )
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required }: {
  label: string; name: string; type?: string
  defaultValue?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type}
        defaultValue={defaultValue} placeholder={placeholder} required={required} />
    </div>
  )
}

function SaveBtn({ isPending, saved }: { isPending: boolean; saved: boolean }) {
  return (
    <Button type="submit" disabled={isPending} size="sm">
      {isPending ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
      ) : saved ? (
        <><CheckCircle2 className="h-4 w-4 text-green-400" /> Guardado</>
      ) : 'Guardar cambios'}
    </Button>
  )
}
