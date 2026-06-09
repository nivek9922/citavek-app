'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, UserX, Clock, MessageSquare, Phone } from 'lucide-react'
import { cn } from '@/shared/ui/utils'
import { formatCop } from '@/shared/format'
import { EmptyState } from '@/shared/ui/empty-state'
import { updateAppointmentStatusAction } from '@/modules/scheduling/actions'
import type { AppointmentRow } from '@/modules/analytics/queries'

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No llegó',
  pending:   'Pendiente',
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

interface Props {
  appointments: AppointmentRow[]
  tenantSlug:   string
}

export function AgendaBoard({ appointments, tenantSlug }: Props) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="Sin citas este día"
        description="Cuando lleguen reservas, aparecerán aquí ordenadas por hora."
      />
    )
  }

  return (
    <div className="space-y-2">
      {appointments.map((apt) => (
        <AppointmentCard key={apt.id} apt={apt} tenantSlug={tenantSlug} />
      ))}
    </div>
  )
}

function AppointmentCard({ apt, tenantSlug }: { apt: AppointmentRow; tenantSlug: string }) {
  const [isPending, setIsPending] = useState(false)

  async function update(status: string) {
    setIsPending(true)
    try {
      await updateAppointmentStatusAction(tenantSlug, apt.id, status)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card p-3 transition-smooth',
      isPending && 'opacity-60',
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Hora */}
        <div className="w-14 shrink-0 text-center">
          <p className="text-lg font-bold text-primary leading-none">
            {format(new Date(apt.startAt), 'HH:mm')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(apt.endAt), 'HH:mm')}
          </p>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{apt.customerName}</p>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', STATUS_COLOR[apt.status])}>
              {STATUS_LABELS[apt.status]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {apt.service.name} · {apt.barber.nickname ?? apt.barber.displayName.split(' ')[0]}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{apt.customerPhone}</p>
            {apt.customerPhone && (
              <a
                href={`https://wa.me/57${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}, tu cita con ${apt.barber.nickname ?? apt.barber.displayName.split(' ')[0]} el ${format(new Date(apt.startAt), 'dd/MM')} a las ${format(new Date(apt.startAt), 'HH:mm')} está confirmada 💈`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Enviar WhatsApp"
                className="flex items-center gap-0.5 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[10px] font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-smooth"
              >
                <Phone className="h-3 w-3" />
                WA
              </a>
            )}
          </div>
          {apt.notes && (
            <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground italic">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
              {apt.notes}
            </p>
          )}
        </div>

        {/* Precio */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-primary">{formatCop(apt.priceCop)}</p>
        </div>
      </div>

      {/* Acciones */}
      {apt.status === 'confirmed' && (
        <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
          <ActionBtn
            onClick={() => update('completed')}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Completar"
            className="text-green-400 hover:bg-green-500/10"
          />
          <ActionBtn
            onClick={() => update('no_show')}
            icon={<UserX className="h-3.5 w-3.5" />}
            label="No llegó"
            className="text-orange-400 hover:bg-orange-500/10"
          />
          <ActionBtn
            onClick={() => update('cancelled')}
            icon={<XCircle className="h-3.5 w-3.5" />}
            label="Cancelar"
            className="text-destructive hover:bg-destructive/10"
          />
        </div>
      )}
      {apt.status === 'pending' && (
        <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
          <ActionBtn
            onClick={() => update('confirmed')}
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Confirmar"
            className="text-primary hover:bg-primary/10"
          />
          <ActionBtn
            onClick={() => update('cancelled')}
            icon={<XCircle className="h-3.5 w-3.5" />}
            label="Cancelar"
            className="text-destructive hover:bg-destructive/10"
          />
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  onClick, icon, label, className,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-smooth',
        className,
      )}
    >
      {icon} {label}
    </button>
  )
}
