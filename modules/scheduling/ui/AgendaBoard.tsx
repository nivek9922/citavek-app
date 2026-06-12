'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatInTimeZone } from 'date-fns-tz'
import { CheckCircle2, XCircle, UserX, Clock, MessageSquare, Phone, Star, BellRing, CheckCheck } from 'lucide-react'
import { buildReminderMessage, sanitizePhoneForWa } from '@/shared/format'
import { cn } from '@/shared/ui/utils'
import { formatCop } from '@/shared/format'
import { EmptyState } from '@/shared/ui/empty-state'
import { updateAppointmentStatusAction } from '@/modules/scheduling/actions'
import { generateReviewLinkAction } from '@/modules/reviews/actions'
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
  appointments:     AppointmentRow[]
  tenantSlug:       string
  timezone:         string
  now:              number
  organizationName: string
}

export function AgendaBoard({ appointments, tenantSlug, timezone, now, organizationName }: Props) {
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
        <AppointmentCard key={apt.id} apt={apt} tenantSlug={tenantSlug} timezone={timezone} now={now} organizationName={organizationName} />
      ))}
    </div>
  )
}

function AppointmentCard({ apt, tenantSlug, timezone, now, organizationName }: { apt: AppointmentRow; tenantSlug: string; timezone: string; now: number; organizationName: string }) {
  const [isPending, setIsPending] = useState(false)
  const [reminded, setReminded]   = useState(false)
  const isFuture = new Date(apt.startAt).getTime() > now

  async function update(status: string) {
    setIsPending(true)
    try {
      const res = await updateAppointmentStatusAction(tenantSlug, apt.id, status)
      if (!res.ok) toast.error(res.error)
    } finally {
      setIsPending(false)
    }
  }

  async function sendReviewInvite() {
    const win = window.open('', '_blank')
    setIsPending(true)
    try {
      const res = await generateReviewLinkAction(tenantSlug, apt.id)
      if (!res.ok) { win?.close(); toast.error(res.error); return }
      const msg = encodeURIComponent(
        `Hola ${apt.customerName}, ¿cómo estuvo tu experiencia? Déjanos tu opinión aquí: ${res.url}`,
      )
      win!.location.href = `https://wa.me/${apt.customerPhone.replace(/\D/g, '')}?text=${msg}`
    } finally {
      setIsPending(false)
    }
  }

  function sendReminder() {
    const formattedTime = formatInTimeZone(new Date(apt.startAt), timezone, 'HH:mm')
    const barberName    = apt.barber.nickname ?? apt.barber.displayName.split(' ')[0] ?? apt.barber.displayName
    const msg = buildReminderMessage({
      customerName:  apt.customerName,
      formattedTime,
      barberName,
      shopName: organizationName,
    })
    window.open(
      `https://wa.me/${sanitizePhoneForWa(apt.customerPhone)}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setReminded(true)
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
            {formatInTimeZone(new Date(apt.startAt), timezone, 'HH:mm')}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatInTimeZone(new Date(apt.endAt), timezone, 'HH:mm')}
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
                href={`https://wa.me/${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}, tu cita con ${apt.barber.nickname ?? apt.barber.displayName.split(' ')[0]} el ${formatInTimeZone(new Date(apt.startAt), timezone, 'dd/MM')} a las ${formatInTimeZone(new Date(apt.startAt), timezone, 'HH:mm')} está confirmada 💈`)}`}
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
          {isFuture && apt.customerPhone && (
            <ActionBtn
              onClick={sendReminder}
              icon={reminded ? <CheckCheck className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
              label={reminded ? 'Enviado' : 'Recordatorio'}
              className={reminded
                ? 'text-[#25D366]/50 hover:bg-[#25D366]/5'
                : 'text-[#25D366] hover:bg-[#25D366]/10'
              }
              title={reminded ? 'Recordatorio ya enviado' : 'Enviar recordatorio por WhatsApp'}
            />
          )}
          <ActionBtn
            onClick={() => update('completed')}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Completar"
            className="text-green-400 hover:bg-green-500/10"
            disabled={isFuture || isPending}
            title={isFuture ? 'No puedes completar una cita futura' : undefined}
          />
          <ActionBtn
            onClick={() => update('no_show')}
            icon={<UserX className="h-3.5 w-3.5" />}
            label="No llegó"
            className="text-orange-400 hover:bg-orange-500/10"
            disabled={isFuture || isPending}
            title={isFuture ? 'No puedes marcar No llegó en una cita futura' : undefined}
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
      {apt.status === 'completed' && apt.customerPhone && (
        <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
          <ActionBtn
            onClick={sendReviewInvite}
            icon={<Star className="h-3.5 w-3.5" />}
            label="Enviar invitación"
            className="text-yellow-400 hover:bg-yellow-500/10"
            disabled={isPending}
          />
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  onClick, icon, label, className, disabled, title,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  className?: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-smooth',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {icon} {label}
    </button>
  )
}
