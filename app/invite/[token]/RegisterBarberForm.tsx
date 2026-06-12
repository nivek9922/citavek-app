'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { linkBarberInviteAction } from '@/modules/staff/actions'
import { Input }  from '@/shared/ui/input'
import { Label }  from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'


interface Props {
  token:       string
  barberName:  string
  orgName:     string
}

export function RegisterBarberForm({ token, barberName, orgName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showPass,  setShowPass]     = useState(false)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd    = new FormData(e.currentTarget)
    const name  = fd.get('name')     as string
    const email = fd.get('email')    as string
    const pass  = fd.get('password') as string

    startTransition(async () => {
      // Paso 1: crear cuenta en Better Auth
      const { data: authData, error: authError } = await authClient.signUp.email(
        { name, email, password: pass },
        { onError: () => {} },
      )

      if (authError) {
        const msg = authError.code === 'USER_ALREADY_EXISTS'
          ? 'Ya existe una cuenta con ese correo. Inicia sesión primero.'
          : (authError.message ?? 'No se pudo crear la cuenta.')
        toast.error(msg)
        return
      }

      if (!authData) {
        toast.error('No se pudo crear la cuenta. Intenta de nuevo.')
        return
      }

      // Paso 2: vincular la cuenta al barbero usando el token
      const res = await linkBarberInviteAction(token)
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      toast.success('Cuenta creada correctamente. ¡Bienvenido!')
      window.location.href = `/${res.slug}/panel`
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Tu nombre</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={barberName}
          placeholder="Carlos Andrés Pérez"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="carlos@ejemplo.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPass ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta…</>
          : 'Crear cuenta y acceder al panel'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Al registrarte, aceptas los términos del servicio de <strong>{orgName}</strong>.
      </p>
    </form>
  )
}
