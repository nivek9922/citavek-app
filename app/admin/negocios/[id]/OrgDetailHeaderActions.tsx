'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageCircle, StickyNote, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
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
import { setOrgStatusAction } from '@/modules/tenancy/actions'
import { sanitizePhoneForWa } from '@/shared/format'

interface Props {
  orgId:  string
  status: 'active' | 'suspended'
  phone:  string | null
  slug:   string
}

const BTN = 'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 sm:w-auto sm:justify-start sm:py-1.5'

export function OrgDetailHeaderActions({ orgId, status, phone }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function toggleStatus() {
    const next = status === 'active' ? 'suspended' : 'active'
    startTransition(async () => {
      const res = await setOrgStatusAction(orgId, next)
      if (res.ok) {
        toast.success(next === 'suspended' ? 'Negocio suspendido.' : 'Negocio reactivado.')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const waHref = phone ? `https://wa.me/${sanitizePhoneForWa(phone)}` : null

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {status === 'active' ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <button disabled={pending} className={`${BTN} border-destructive/40 text-destructive hover:bg-destructive/10`}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PowerOff className="h-3.5 w-3.5" />}
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
                onClick={(e) => { e.preventDefault(); toggleStatus() }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Suspender
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <button onClick={toggleStatus} disabled={pending} className={`${BTN} border-green-500/40 text-green-500 hover:bg-green-500/10`}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          Reactivar
        </button>
      )}

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN} border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      )}

      <a href="#notas" className={`${BTN} border-border hover:border-primary/50 hover:text-primary`}>
        <StickyNote className="h-3.5 w-3.5" />
        Ver notas internas
      </a>
    </div>
  )
}
