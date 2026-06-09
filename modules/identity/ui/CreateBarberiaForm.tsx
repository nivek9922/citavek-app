'use client'
import { useState } from 'react'
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import Link    from 'next/link'
import { Input }   from '@/shared/ui/input'
import { Label }   from '@/shared/ui/label'
import { Button }  from '@/shared/ui/button'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import { cn }      from '@/shared/ui/utils'
import { COLOMBIA_CITIES, type ColombiaCity } from '@/shared/constants/colombia-cities'
import { createBarberiaAction } from '@/modules/identity/actions'

const PALETTE = ['#E0A300', '#22C55E', '#F43F5E', '#3B82F6', '#A855F7', '#06B6D4', '#F97316', '#1A1A1A']

interface CreatedData {
  id:           string
  slug:         string
  name:         string
  city:         string
  primaryColor: string
}

interface Props {
  onCreated?: (data: CreatedData) => void
}

export function CreateBarberiaForm({ onCreated }: Props = {}) {
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState('')
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [color,       setColor]       = useState('#E0A300')
  const [city,        setCity]        = useState<ColombiaCity | ''>('')

  function slugify(name: string) {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setCreatedSlug(null)
    const fd   = new FormData(e.currentTarget)
    const form = e.currentTarget

    if (!city) { setError('Selecciona una ciudad.'); return }

    const input = {
      name:          fd.get('name')          as string,
      slug:          fd.get('slug')          as string,
      city,
      address:       fd.get('address')       as string,
      phone:         fd.get('phone')         as string,
      primaryColor:  color,
      ownerEmail:    fd.get('ownerEmail')    as string,
      ownerPassword: fd.get('ownerPassword') as string,
      ownerName:     fd.get('ownerName')     as string,
    }

    setIsLoading(true)
    const res = await createBarberiaAction(input)
    setIsLoading(false)
    if (!res.ok) { setError(res.error); return }
    setCreatedSlug(res.slug)
    form.reset()
    setColor('#E0A300')
    onCreated?.({ id: res.id, slug: res.slug, name: input.name, city: input.city, primaryColor: color })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Info de la barbería */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Datos de la barbería
          </h3>
          <Field label="Nombre" name="name" placeholder="San Fernando Barber Club"
            onChange={(v, el) => {
              const slugEl = el.closest('form')?.querySelector<HTMLInputElement>('[name=slug]')
              if (slugEl && !slugEl.dataset.edited) slugEl.value = slugify(v)
            }} />
          <Field label="Slug (URL)" name="slug" placeholder="san-fernando-cali"
            hint="bookingflow.co/san-fernando-cali"
            onInput={(e) => { (e.target as HTMLInputElement).dataset.edited = '1' }} />
          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Select value={city} onValueChange={(v) => setCity(v as ColombiaCity)}>
              <SelectTrigger id="city">
                <SelectValue placeholder="Selecciona una ciudad" />
              </SelectTrigger>
              <SelectContent>
                {COLOMBIA_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Dirección" name="address" placeholder="Cra 39 #5-12" />
          <Field label="Teléfono / WhatsApp" name="phone" placeholder="+573187654321" />

          {/* Color */}
          <div className="space-y-2">
            <Label>Color de marca</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('h-8 w-8 rounded-lg border-2 transition-smooth',
                    color.toLowerCase() === c.toLowerCase()
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-lg border-2 border-border bg-transparent" />
            </div>
          </div>
        </div>

        {/* Info del owner */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Cuenta del dueño
          </h3>
          <Field label="Nombre completo" name="ownerName" placeholder="Carlos Pérez" />
          <Field label="Correo electrónico" name="ownerEmail" type="email" placeholder="carlos@email.com" />
          <Field label="Contraseña inicial" name="ownerPassword" type="password"
            placeholder="Mínimo 8 caracteres" hint="El dueño podrá cambiarla después" />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}
      {createdSlug && (
        <div className="flex items-center justify-between rounded-xl bg-green-500/10 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Barbería <strong>/{createdSlug}</strong> creada
            {isLoading && <span className="text-xs text-muted-foreground">— actualizando lista…</span>}
          </span>
          <Link
            href={`/${createdSlug}/panel`}
            className="flex items-center gap-1 text-xs font-medium text-green-400 hover:text-green-300 transition-colors"
          >
            Ir al panel <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</>
          : 'Crear barbería'}
      </Button>
    </form>
  )
}

function Field({
  label, name, placeholder, type = 'text', hint, onChange, onInput,
}: {
  label: string; name: string; placeholder?: string; type?: string
  hint?: string
  onChange?: (value: string, el: HTMLInputElement) => void
  onInput?: (e: React.SyntheticEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required
        onChange={onChange ? (e) => onChange(e.target.value, e.target) : undefined}
        onInput={onInput} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
