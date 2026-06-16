'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, CalendarPlus, PauseCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  ResponsiveSheet, ResponsiveSheetContent, ResponsiveSheetDescription,
  ResponsiveSheetHeader, ResponsiveSheetTitle, ResponsiveSheetTrigger,
} from '@/shared/ui/responsive-sheet'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/shared/ui/alert-dialog'
import { DatePicker } from '@/shared/ui/date-picker'
import { Button } from '@/shared/ui/button'
import { BASIC_PRICE_COP } from '@/shared/constants/billing'
import type { SubscriptionStatus } from '@/modules/subscriptions/domain/subscription'
import {
  activateSubscriptionAction, extendTrialAction,
  suspendSubscriptionAction, cancelSubscriptionAction,
} from '@/modules/subscriptions/actions'

export function SubscriptionManager({ orgId, status }: { orgId: string; status: SubscriptionStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, onDone?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(success)
        onDone?.()
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ActivatePaymentSheet orgId={orgId} pending={pending} run={run} />

      {status !== 'active' && status !== 'cancelled' && (
        <ExtendTrialSheet orgId={orgId} pending={pending} run={run} />
      )}

      {status !== 'suspended' && status !== 'cancelled' && (
        <SuspendDialog orgId={orgId} pending={pending} run={run} />
      )}

      {status !== 'cancelled' && (
        <CancelDialog orgId={orgId} pending={pending} run={run} />
      )}
    </div>
  )
}

type RunFn = (
  fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  success: string,
  onDone?: () => void,
) => void

// ── Activar pago manual ────────────────────────────────────────────────────────

function ActivatePaymentSheet({ orgId, pending, run }: { orgId: string; pending: boolean; run: RunFn }) {
  const [open, setOpen]     = useState(false)
  const [amount, setAmount] = useState(String(BASIC_PRICE_COP))
  const [paidAt, setPaidAt] = useState<Date | undefined>(new Date())
  const [method, setMethod] = useState<'efectivo' | 'transferencia'>('efectivo')

  function submit() {
    const amountCop = Number(amount)
    if (!Number.isFinite(amountCop) || amountCop <= 0) { toast.error('Ingresa un monto válido.'); return }
    if (!paidAt) { toast.error('Selecciona la fecha de pago.'); return }
    run(
      () => activateSubscriptionAction(orgId, { amountCop, paidAtISO: paidAt.toISOString(), paymentMethod: method }),
      'Pago registrado. Suscripción activa.',
      () => setOpen(false),
    )
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen}>
      <ResponsiveSheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Activar pago manual
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent className="w-full sm:max-w-md">
        <ResponsiveSheetHeader className="mb-6">
          <ResponsiveSheetTitle>Registrar pago manual</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            Confirma un pago recibido. La suscripción quedará activa por 1 mes desde la fecha indicada.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Monto (COP)</span>
            <input
              type="number" min={1} value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-card/60 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-primary/40 sm:text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Fecha de pago</span>
            <DatePicker value={paidAt} onChange={setPaidAt} modal />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Método</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'efectivo' | 'transferencia')}
              className="w-full rounded-xl border border-border bg-card/60 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-primary/40 sm:text-sm"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>

          <Button onClick={submit} disabled={pending} className="w-full gap-2">
            {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Registrar pago'}
          </Button>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  )
}

// ── Extender prueba ─────────────────────────────────────────────────────────────

function ExtendTrialSheet({ orgId, pending, run }: { orgId: string; pending: boolean; run: RunFn }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState('15')

  function submit() {
    const n = Number(days)
    if (!Number.isInteger(n) || n <= 0) { toast.error('Ingresa un número de días válido.'); return }
    run(
      () => extendTrialAction(orgId, { days: n }),
      `Prueba extendida ${n} días.`,
      () => setOpen(false),
    )
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={setOpen}>
      <ResponsiveSheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <CalendarPlus className="h-4 w-4" /> Extender prueba
        </Button>
      </ResponsiveSheetTrigger>
      <ResponsiveSheetContent className="w-full sm:max-w-md">
        <ResponsiveSheetHeader className="mb-6">
          <ResponsiveSheetTitle>Extender período de prueba</ResponsiveSheetTitle>
          <ResponsiveSheetDescription>
            Suma días al vencimiento del trial. Si ya venció, se cuentan desde hoy.
          </ResponsiveSheetDescription>
        </ResponsiveSheetHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Días a sumar</span>
            <input
              type="number" min={1} max={365} value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-xl border border-border bg-card/60 px-3 py-2.5 text-base focus:outline-none focus:ring-1 focus:ring-primary/40 sm:text-sm"
            />
          </label>
          <Button onClick={submit} disabled={pending} className="w-full gap-2">
            {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Extendiendo…</> : 'Extender prueba'}
          </Button>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  )
}

// ── Suspender (destructivo) ─────────────────────────────────────────────────────

function SuspendDialog({ orgId, pending, run }: { orgId: string; pending: boolean; run: RunFn }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-orange-500 hover:text-orange-600">
          <PauseCircle className="h-4 w-4" /> Suspender
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Suspender la suscripción?</AlertDialogTitle>
          <AlertDialogDescription>
            El negocio no podrá crear nuevas citas y su página pública mostrará un aviso. Podrás
            reactivarla registrando un pago.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              run(() => suspendSubscriptionAction(orgId), 'Suscripción suspendida.')
            }}
          >
            Suspender
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Cancelar (destructivo, con motivo) ──────────────────────────────────────────

function CancelDialog({ orgId, pending, run }: { orgId: string; pending: boolean; run: RunFn }) {
  const [reason, setReason] = useState('')

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
          <XCircle className="h-4 w-4" /> Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar la suscripción?</AlertDialogTitle>
          <AlertDialogDescription>
            Cancelación definitiva. El negocio dejará de operar. Anota el motivo para el registro interno.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo de la cancelación (opcional)…"
          rows={3}
          maxLength={300}
          className="w-full resize-none rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-destructive/40"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault()
              run(() => cancelSubscriptionAction(orgId, { reason: reason.trim() || undefined }), 'Suscripción cancelada.')
            }}
          >
            Cancelar suscripción
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
