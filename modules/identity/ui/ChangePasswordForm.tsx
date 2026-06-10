'use client'
import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { Input }  from '@/shared/ui/input'
import { Label }  from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import { changePasswordAction } from '@/modules/identity/actions'

export function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [isPending,   startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const fd = new FormData(e.currentTarget)
    const currentPassword = fd.get('currentPassword') as string
    const newPassword     = fd.get('newPassword')     as string
    const confirmPassword = fd.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }

    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <PasswordField
        id="currentPassword"
        label="Contraseña actual"
        show={showCurrent}
        onToggle={() => setShowCurrent((s) => !s)}
        disabled={isPending}
        autoComplete="current-password"
      />
      <PasswordField
        id="newPassword"
        label="Nueva contraseña"
        show={showNew}
        onToggle={() => setShowNew((s) => !s)}
        disabled={isPending}
        autoComplete="new-password"
        minLength={8}
        hint="Mínimo 8 caracteres"
      />
      <PasswordField
        id="confirmPassword"
        label="Confirmar nueva contraseña"
        show={showNew}
        onToggle={() => setShowNew((s) => !s)}
        disabled={isPending}
        autoComplete="new-password"
      />

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-2.5 text-sm text-green-600 dark:text-green-400">
          <ShieldCheck className="h-4 w-4" />
          Contraseña actualizada correctamente.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Cambiar contraseña
      </Button>
    </form>
  )
}

function PasswordField({
  id, label, show, onToggle, disabled, autoComplete, minLength, hint,
}: {
  id:            string
  label:         string
  show:          boolean
  onToggle:      () => void
  disabled:      boolean
  autoComplete?: string
  minLength?:    number
  hint?:         string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          className="pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
