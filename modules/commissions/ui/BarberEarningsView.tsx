import { Wallet, Calendar, CalendarDays, type LucideIcon } from 'lucide-react'
import { formatCop } from '@/shared/format'
import { SettlementCard } from './SettlementsManager'
import type { BarberEarningsSummary } from '../queries'
import type { BarberEarnings } from '../application/get-barber-earnings'
import type { SettlementRecord } from '../domain/ports/commissions-repository'

/**
 * Vista del barbero: solo sus propias ganancias. Todos los datos llegan resueltos
 * desde el server component (el `barberId` se obtiene del userId autenticado, nunca
 * del cliente), así que este componente no realiza ninguna petición.
 */
export function BarberEarningsView({
  summary,
  settlements,
  barberName,
}: {
  summary: BarberEarningsSummary
  settlements: SettlementRecord[]
  barberName: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">Mis ganancias</h2>
        <p className="text-sm text-muted-foreground">
          Hola {barberName.split(' ')[0]}, este es el resumen de lo que has generado.
        </p>
      </div>

      {/* Hoy — destacado */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-primary">
          <Wallet className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Hoy</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Generaste</p>
        <p className="font-display text-3xl tracking-wide tabular-nums">{formatCop(summary.today.grossRevenueCop)}</p>
        <p className="mt-1 text-sm">
          Tu comisión: <span className="font-semibold text-primary">{formatCop(summary.today.commissionCop)}</span>
          {' · '}
          {summary.today.appointmentCount} {summary.today.appointmentCount === 1 ? 'cita' : 'citas'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PeriodCard icon={Calendar}     label="Esta semana" earnings={summary.week} />
        <PeriodCard icon={CalendarDays} label="Este mes"    earnings={summary.month} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mis liquidaciones</h3>
        {settlements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes liquidaciones registradas.</p>
        ) : (
          settlements.map((s) => <SettlementCard key={s.id} s={s} />)
        )}
      </div>
    </div>
  )
}

function PeriodCard({ icon: Icon, label, earnings }: { icon: LucideIcon; label: string; earnings: BarberEarnings }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl tracking-wide tabular-nums">{formatCop(earnings.commissionCop)}</p>
      <p className="text-xs text-muted-foreground">
        de {formatCop(earnings.grossRevenueCop)} · {earnings.appointmentCount} {earnings.appointmentCount === 1 ? 'cita' : 'citas'}
      </p>
    </div>
  )
}
