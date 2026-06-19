'use client'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { DatePicker } from '@/shared/ui/date-picker'
import { formatCop } from '@/shared/format'
import type { DailyClosing as DailyClosingData } from '../application/get-daily-closing'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function DailyClosing({
  tenantSlug,
  closing,
  dateStr,
}: {
  tenantSlug: string
  closing: DailyClosingData
  dateStr: string
}) {
  const router   = useRouter()
  const selected = parseISO(dateStr)

  function onDate(d: Date | undefined) {
    if (!d) return
    router.push(`/${tenantSlug}/panel/comisiones?date=${format(d, 'yyyy-MM-dd')}`)
  }

  const worked = closing.rows.filter((r) => r.appointmentCount > 0)

  return (
    <div className="space-y-5">
      <DatePicker value={selected} onChange={onDate} />

      <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cierre de caja — {capitalize(format(selected, "EEEE d 'de' MMMM", { locale: es }))}
        </h3>
        <TotalRow label="Total facturado"  value={formatCop(closing.totals.grossRevenueCop)} />
        <TotalRow label="Total comisiones" value={formatCop(closing.totals.commissionCop)} />
        <div className="border-t border-border pt-2">
          <TotalRow label="Tu ganancia neta" value={formatCop(closing.totals.ownerProfitCop)} strong />
        </div>
      </div>

      {worked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay citas completadas este día.</p>
      ) : (
        <div className="space-y-2">
          {worked.map((r) => (
            <div key={r.barberId} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.barberName}</p>
                {!r.hasConfig && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400">
                    <AlertTriangle className="h-3 w-3" /> Sin comisión
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.appointmentCount} {r.appointmentCount === 1 ? 'cita' : 'citas'} · {formatCop(r.grossRevenueCop)}
                {' · '}comisión <span className="font-medium text-foreground">{formatCop(r.commissionCop)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>{label}</span>
      <span className={strong ? 'font-display text-xl tracking-wide tabular-nums text-primary' : 'text-sm font-medium tabular-nums'}>
        {value}
      </span>
    </div>
  )
}
