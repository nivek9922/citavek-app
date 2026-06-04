'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Input }  from '@/shared/ui/input'
import { Label }  from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { cn }     from '@/shared/ui/utils'

export function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd    = new FormData(e.currentTarget)
    const email = fd.get('email')    as string
    const pass  = fd.get('password') as string

    startTransition(async () => {
      const res = await authClient.signIn.email({
        email,
        password: pass,
        callbackURL: '/redirect',
      })

      if (res.error) {
        setError('Correo o contraseña incorrectos.')
        return
      }
      router.push('/redirect')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          autoComplete="email"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className={cn('rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive')}>
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</>
        ) : 'Iniciar sesión'}
      </Button>
    </form>
  )
}
