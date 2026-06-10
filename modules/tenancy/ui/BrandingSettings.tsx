'use client'
import Image from 'next/image'
import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Palette, Store, ImageIcon } from 'lucide-react'
import { Button }  from '@/shared/ui/button'
import { Input }   from '@/shared/ui/input'
import { Label }   from '@/shared/ui/label'
import { cn }      from '@/shared/ui/utils'
import {
  updateBrandingAction,
  updateOrgInfoAction,
  uploadTenantLogoAction,
  uploadTenantCoverAction,
  deleteTenantBrandAssetAction,
} from '../actions'

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

      {/* Imágenes */}
      <Section icon={<ImageIcon className="h-5 w-5 text-primary" />} title="Imágenes">
        {!branding?.logoUrl && !branding?.coverUrl && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
            <p className="font-medium">¿Para qué sirve cada imagen?</p>
            <div className="space-y-1.5 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Logo —</span>{' '}
                Aparece en el encabezado de tu panel y en la página de reservas que tus clientes visitan.
              </p>
              <p>
                <span className="font-medium text-foreground">Portada —</span>{' '}
                Es la imagen de fondo que ven tus clientes al abrir tu link. Una portada atractiva convierte más visitas en citas.
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUploader
            label="Logo"
            hint="Aparece en el header del panel."
            currentUrl={branding?.logoUrl ?? null}
            action={uploadTenantLogoAction}
            deleteAction={(slug) => deleteTenantBrandAssetAction(slug, 'logo')}
            tenantSlug={tenantSlug}
          />
          <ImageUploader
            label="Imagen de portada"
            hint="Fondo del hero en la página pública."
            currentUrl={branding?.coverUrl ?? null}
            action={uploadTenantCoverAction}
            deleteAction={(slug) => deleteTenantBrandAssetAction(slug, 'cover')}
            tenantSlug={tenantSlug}
          />
        </div>
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
  const [isPending, setIsPending] = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    setIsPending(true)
    try {
      await updateOrgInfoAction(tenantSlug, new FormData(e.currentTarget))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setIsPending(false)
    }
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
  const [color,     setColor]     = useState(branding?.primaryColor ?? '#E0A300')
  const [isPending, setIsPending] = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    fd.set('primaryColor', color)
    try {
      await updateBrandingAction(tenantSlug, fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setIsPending(false)
    }
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

      <SaveBtn isPending={isPending} saved={saved} />
    </form>
  )
}

type UploadAction = (
  slug: string,
  fd: FormData,
) => Promise<{ ok: true; url: string } | { ok: false; error: string }>

type DeleteAction = (
  slug: string,
) => Promise<{ ok: true } | { ok: false; error: string }>

function ImageUploader({
  label, hint, currentUrl, action, deleteAction, tenantSlug,
}: {
  label:         string
  hint:          string
  currentUrl:    string | null
  action:        UploadAction
  deleteAction?: DeleteAction
  tenantSlug:    string
}) {
  const [preview,    setPreview]    = useState<string | null>(currentUrl)
  const [hasFile,    setHasFile]    = useState(false)
  const [isPending,  startUpload]   = useTransition()
  const [isDeleting, startDelete]   = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setHasFile(false); return }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El archivo supera los 4 MB.')
      setHasFile(false)
      e.target.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
    setHasFile(true)
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set('file', file)
    startUpload(async () => {
      try {
        const res = await action(tenantSlug, fd)
        if (res.ok) {
          toast.success('Imagen actualizada correctamente.')
          setPreview(res.url)
          setHasFile(false)
          if (fileRef.current) fileRef.current.value = ''
        } else {
          toast.error(res.error)
        }
      } catch {
        toast.error('Error de red. Intenta de nuevo.')
      }
    })
  }

  function handleDelete() {
    if (!deleteAction) return
    startDelete(async () => {
      try {
        const res = await deleteAction(tenantSlug)
        if (res.ok) {
          toast.success('Imagen eliminada.')
          setPreview(null)
          setHasFile(false)
          if (fileRef.current) fileRef.current.value = ''
        } else {
          toast.error(res.error)
        }
      } catch {
        toast.error('Error de red. Intenta de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      {preview ? (
        <div className="relative h-24 w-full overflow-hidden rounded-xl border border-border">
          <Image src={preview} alt={label} fill unoptimized priority className="object-cover" />
        </div>
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
          Sin imagen
        </div>
      )}

      <Input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="cursor-pointer text-sm"
      />

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || isDeleting || !hasFile}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</>
          ) : (
            'Subir imagen'
          )}
        </Button>
        {preview && deleteAction && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDeleting || isPending}
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
          </Button>
        )}
      </div>
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
