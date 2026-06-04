'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { authClient }   from '@/lib/auth-client'
import { Input }        from '@/shared/ui/input'
import { Label }        from '@/shared/ui/label'
import { Button }       from '@/shared/ui/button'
import { cn }           from '@/shared/ui/utils'
import { createBarberiaForSelfAction } from '@/modules/identity/actions'

const PALETTE = ['#E0A300', '#22C55E', '#F43F5E', '#3B82F6', '#A855F7', '#06B6D4', '#F97316', '#1A1A1A']

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}

export function SignUpForm() {
  const [isPending, startTransition] = useTransition()
  const [showPass,  setShowPass]  = useState(false)
  const [color,     setColor]     = useState('#E0A300')
  const [error,     setError]     = useState('')
  const [step,      setStep]      = useState<'form' | 'creating'>('form')

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    const ownerName  = fd.get('ownerName')  as string
    const email      = fd.get('email')      as string
    const password   = fd.get('password')   as string
    const shopName   = fd.get('shopName')   as string
    const slug       = fd.get('slug')       as string
    const city       = fd.get('city')       as string
    const phone      = fd.get('phone')      as string

    startTransition(async () => {
      try {
        setStep('creating')

        // Paso 1: crear cuenta (better-auth setea la cookie de sesión).
        // Sin callbackURL para evitar que el cliente navegue automáticamente.
        const { data: authData, error: authError } = await authClient.signUp.email(
          { name: ownerName, email, password },
          { onError: () => {} },  // evita que mejor-auth lance excepciones no controladas
        )

        if (authError) {
          const msg = authError.code === 'USER_ALREADY_EXISTS'
            ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
            : (authError.message ?? 'No se pudo crear la cuenta.')
          setError(msg)
          setStep('form')
          return
        }

        // Paso 2: crear la barbería (Server Action usa la sesión recién creada).
        // Se pasa userId del signup como fallback por si la cookie aún no propagó.
        const res = await createBarberiaForSelfAction({
          name:         shopName,
          slug,
          city,
          phone,
          primaryColor: color,
          _userId:      authData?.user.id,
        })

        if (!res.ok) {
          setError(res.error)
          setStep('form')
          return
        }

        // Hard navigation para que el nuevo request incluya la sesión recién creada.
        window.location.href = `/${res.slug}/panel`
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
        setStep('form')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Cuenta ───────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tu cuenta
        </legend>

        <Field label="Tu nombre" name="ownerName" placeholder="Carlos Pérez" disabled={isPending} />

        <Field label="Correo electrónico" name="email" type="email"
          placeholder="carlos@email.com" disabled={isPending} autoComplete="email" />

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input id="password" name="password" type={showPass ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres" required minLength={8}
              disabled={isPending} autoComplete="new-password" className="pr-10" />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </fieldset>

      <div className="border-t border-border" />

      {/* ── Barbería ─────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tu barbería
        </legend>

        <Field label="Nombre de la barbería" name="shopName"
          placeholder="San Fernando Barber Club" disabled={isPending}
          onChange={(v, el) => {
            const slugEl = el.closest('form')?.querySelector<HTMLInputElement>('[name=slug]')
            if (slugEl && !slugEl.dataset.edited) slugEl.value = slugify(v)
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="slug">URL de tu página</Label>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="shrink-0 text-muted-foreground">bookingflow.co/</span>
            <input id="slug" name="slug" required
              pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Solo letras minúsculas, números y guiones, sin guión al inicio ni al final"
              className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-muted-foreground/50"
              placeholder="san-fernando-cali"
              disabled={isPending}
              onInput={(e) => { (e.target as HTMLInputElement).dataset.edited = '1' }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Solo letras minúsculas, números y guiones.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad" name="city" placeholder="Cali" disabled={isPending} />
          <Field label="WhatsApp / Teléfono" name="phone" placeholder="+573187654321" disabled={isPending} />
        </div>

        {/* Color de marca */}
        <div className="space-y-2">
          <Label>Color de marca</Label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn('h-8 w-8 rounded-lg border-2 transition-all',
                  color.toLowerCase() === c.toLowerCase()
                    ? 'border-foreground scale-110 shadow-md'
                    : 'border-transparent hover:scale-105')}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-lg border-2 border-border bg-transparent"
              aria-label="Color personalizado"
            />
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {step === 'creating' ? 'Creando tu barbería…' : 'Procesando…'}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Crear mi cuenta y barbería
          </>
        )}
      </Button>
    </form>
  )
}

function Field({
  label, name, placeholder, type = 'text', disabled, autoComplete, onChange,
}: {
  label: string; name: string; placeholder?: string
  type?: string; disabled?: boolean; autoComplete?: string
  onChange?: (value: string, el: HTMLInputElement) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder}
        required disabled={disabled} autoComplete={autoComplete}
        onChange={onChange ? (e) => onChange(e.target.value, e.target) : undefined}
      />
    </div>
  )
}
