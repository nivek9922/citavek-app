'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, Calculator, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { DatePicker } from '@/shared/ui/date-picker'
import { cn } from '@/shared/ui/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { formatCop } from '@/shared/format'
import { previewSettlementAction, createSettlementAction } from '../actions'
import type { PreviewSettlementData } from '../actions'
import type { BarberCommissionRecord, SettlementRecord } from '../domain/ports/commissions-repository'

type Kind = 'week' | 'month' | 'custom'

const KINDS: { value: Kind; label: string }[] = [
  { value: 'week',   label: 'Semana actual' },
  { value: 'month',  label: 'Mes actual' },
  { value: 'custom', label: 'Rango personalizado' },
]

export function SettlementsManager({
  tenantSlug,
  barbers,
  settlements,
}: {
  tenantSlug: string
  barbers: BarberCommissionRecord[]
  settlements: SettlementRecord[]
}) {
  const router = useRouter()
  const [barberId, setBarberId] = useState(barbers[0]?.barberId ?? '')
  const [kind, setKind]         = useState<Kind>('week')
  const [start, setStart]       = useState<Date | undefined>()
  const [end, setEnd]           = useState<Date | undefined>()
  const [preview, setPreview]   = useState<PreviewSettlementData | null>(null)
  const [notes, setNotes]       = useState('')
  const [isPending, startTransition] = useTransition()

  function resetPreview() {
    setPreview(null)
  }

  function buildInput() {
    return {
      barberId,
      kind,
      startStr: kind === 'custom' && start ? format(start, 'yyyy-MM-dd') : undefined,
      endStr:   kind === 'custom' && end ? format(end, 'yyyy-MM-dd') : undefined,
    }
  }

  function handlePreview() {
    if (!barberId) { toast.error('Selecciona un barbero.'); return }
    if (kind === 'custom' && (!start || !end)) { toast.error('Selecciona la fecha inicial y final.'); return }
    startTransition(async () => {
      const res = await previewSettlementAction(tenantSlug, buildInput())
      if (res.ok) setPreview(res.data)
      else { setPreview(null); toast.error(res.error) }
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createSettlementAction(tenantSlug, {
        ...buildInput(),
        paid:  true,
        notes: notes.trim() || null,
      })
      if (res.ok) {
        toast.success('Liquidación registrada y marcada como pagada.')
        setPreview(null)
        setNotes('')
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const barberName = barbers.find((b) => b.barberId === barberId)?.displayName ?? 'el barbero'

  const conflictSettlement = preview
    ? settlements.find((s) =>
        s.barberId === barberId &&
        s.paid &&
        new Date(s.periodStart) < preview.periodEnd &&
        new Date(s.periodEnd)   > preview.periodStart
      ) ?? null
    : null

  return (
    <div className="space-y-6">
      {barbers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tienes barberos activos.</p>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calcular liquidación</h3>

          <div className="space-y-1.5">
            <Label>Barbero</Label>
            <Select value={barberId} onValueChange={(v) => { setBarberId(v); resetPreview() }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar barbero" /></SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.barberId} value={b.barberId}>
                    {b.nickname ?? b.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => { setKind(k.value); resetPreview() }}
                  className={cn(
                    'rounded-xl border-[1.5px] px-2 py-2 text-xs font-medium transition-smooth',
                    kind === k.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {kind === 'custom' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <DatePicker value={start} onChange={(d) => { setStart(d); resetPreview() }} placeholder="Fecha inicial" />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <DatePicker value={end} onChange={(d) => { setEnd(d); resetPreview() }} min={start} placeholder="Fecha final" />
              </div>
            </div>
          )}

          <Button onClick={handlePreview} disabled={isPending} size="sm" variant="outline">
            {isPending && !preview ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando…</> : <><Calculator className="h-4 w-4" /> Calcular</>}
          </Button>

          {preview && (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="space-y-1.5">
                <PreviewRow label="Citas completadas" value={String(preview.appointmentCount)} />
                <PreviewRow label="Total generado"    value={formatCop(preview.grossRevenueCop)} />
                <PreviewRow label="Comisión a pagar"  value={formatCop(preview.commissionCop)} strong />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settlement-notes">Nota (opcional)</Label>
                <Textarea
                  id="settlement-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pagado en efectivo, transferencia…"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {conflictSettlement && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  <span className="font-medium">Este período ya fue liquidado</span> el{' '}
                  {(conflictSettlement.paidAt ?? conflictSettlement.createdAt).toLocaleDateString('es-CO', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}{' '}
                  — comisión {formatCop(conflictSettlement.commissionCop)} pagada. Revisa el historial.
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isPending || preview.appointmentCount === 0 || !!conflictSettlement} size="sm" className="w-full">
                    <CheckCircle2 className="h-4 w-4" /> Marcar como pagado
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Registrar esta liquidación?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se registrará un pago de {formatCop(preview.commissionCop)} a {barberName} y quedará en el
                      histórico. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreate}>Sí, registrar pago</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial de liquidaciones</h3>
        {settlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has registrado liquidaciones.</p>
        ) : (
          settlements.map((s) => <SettlementCard key={s.id} s={s} withBarber />)
        )}
      </div>
    </div>
  )
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-display text-lg tracking-wide tabular-nums text-primary' : 'text-sm font-medium tabular-nums'}>
        {value}
      </span>
    </div>
  )
}

/** Tarjeta de una liquidación del histórico. `withBarber` muestra el nombre (vista owner). */
export function SettlementCard({ s, withBarber }: { s: SettlementRecord; withBarber?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {withBarber ? s.barberName : formatPeriod(s.periodStart, s.periodEnd)}
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            s.paid ? 'bg-green-500/10 text-green-500' : 'bg-orange-400/10 text-orange-400',
          )}
        >
          {s.paid ? 'Pagado' : 'Pendiente'}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {withBarber ? `${formatPeriod(s.periodStart, s.periodEnd)} · ` : ''}
        {s.appointmentCount} citas · generó {formatCop(s.grossRevenueCop)}
      </p>
      <p className="mt-1 text-sm">
        Comisión: <span className="font-semibold text-primary">{formatCop(s.commissionCop)}</span>
      </p>
      {s.notes && <p className="mt-1 text-xs text-muted-foreground">“{s.notes}”</p>}
    </div>
  )
}

/** El período se guarda como [start, end) (end = medianoche del día siguiente al último). */
function formatPeriod(start: Date, end: Date): string {
  const lastDay = subDays(end, 1)
  return `${format(start, 'd MMM', { locale: es })} – ${format(lastDay, 'd MMM yyyy', { locale: es })}`
}
