'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { setOrgStatusAction } from '../actions'

interface Props {
  orgId:          string
  status:         'active' | 'suspended'
  onStatusChange: (orgId: string, newStatus: 'active' | 'suspended') => void
}

export function OrgStatusToggle({ orgId, status, onStatusChange }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function toggle() {
    if (pending) return
    const next = status === 'active' ? 'suspended' : 'active'
    setError(null)
    setPending(true)
    const res = await setOrgStatusAction(orgId, next)
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onStatusChange(orgId, next)
  }

  if (status === 'active') {
    return (
      <div className="flex flex-col items-end gap-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Suspender
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Suspender este negocio?</AlertDialogTitle>
              <AlertDialogDescription>
                Los clientes no podrán agendar nuevas citas mientras esté suspendido.
                Podrás reactivarlo en cualquier momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={toggle}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Suspender
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {error && (
          <span className="text-[10px] text-destructive">{error}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Activar
      </button>
      {error && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
    </div>
  )
}
