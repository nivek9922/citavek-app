import { db } from '@/server/db'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { findDeadSlots } from '@/modules/scheduling/application/find-dead-slots'
import { findInactiveCustomers } from '@/modules/customers/queries'
import { prismaSchedulingRepository } from '@/modules/scheduling/infrastructure/prisma-scheduling-repository'
import { sanitizePhoneForWa } from '@/modules/scheduling/domain/whatsapp-reminder'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, MessageCircle, TrendingUp } from 'lucide-react'

export default async function HorasMuertasPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const [deadSlots, inactiveCustomers, barbers] = await Promise.all([
    findDeadSlots(prismaSchedulingRepository, ctx.id),
    findInactiveCustomers(ctx.id),
    db.barber.findMany({
      where:  { organizationId: ctx.id, active: true },
      select: { id: true, displayName: true, nickname: true },
    }),
  ])

  const barberLabel = (id: string) => {
    const b = barbers.find((b) => b.id === id)
    return b?.nickname ?? b?.displayName ?? id
  }

  const buildWaUrl = (phone: string, name: string) => {
    const wa  = sanitizePhoneForWa(phone)
    const msg = encodeURIComponent(
      `¡Hola ${name}! 👋 Te echamos de menos en ${ctx.name}. ¿Cuándo pasas para una cita? Tenemos horarios disponibles. ¡Te esperamos! 💈`,
    )
    return `https://wa.me/${wa}?text=${msg}`
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Horas muertas"
        description="Detecta huecos de agenda y reactiva clientes que no reservan hace +30 días."
      />

      {/* ── Huecos de agenda ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Huecos los próximos 3 días</h2>
        </div>

        {deadSlots.length === 0 ? (
          <EmptyState
            icon="🔥"
            title="Agenda apretada"
            description="No hay horas muertas los próximos 3 días. ¡Buen ritmo!"
          />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {deadSlots.map((day) => {
              // Crear fecha al mediodía UTC para que format() muestre el día correcto
              // sin importar el timezone del servidor.
              const displayDate = new Date(day.date + 'T12:00:00Z')
              return (
                <div key={day.date} className="bg-card px-5 py-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold capitalize">
                      {format(displayDate, 'EEEE d MMMM', { locale: es })}
                    </p>
                    <span className="text-sm font-medium text-amber-600">
                      ~{Math.round(day.totalFreeMin / 60)} h libres
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {day.barbers.map((b) => (
                      <span
                        key={b.barberId}
                        className="rounded-lg bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
                      >
                        {barberLabel(b.barberId)} · {Math.round(b.freeMin / 60)} h
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Clientes inactivos ───────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">
            Clientes sin cita en +30 días
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({inactiveCustomers.length})
            </span>
          </h2>
        </div>

        {inactiveCustomers.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="Todos activos"
            description="No hay clientes inactivos. ¡Recurrencia excelente!"
          />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {inactiveCustomers.map((c) => (
              <div key={c.id} className="flex items-center gap-4 bg-card px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  {c.lastVisit && (
                    <p className="text-xs text-muted-foreground">
                      Última visita:{' '}
                      {formatDistanceToNow(new Date(c.lastVisit), { addSuffix: true, locale: es })}
                    </p>
                  )}
                </div>
                <a
                  href={buildWaUrl(c.phone, c.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-700 transition-smooth hover:bg-green-500/20 dark:text-green-400"
                >
                  <MessageCircle className="h-4 w-4" />
                  Escribir
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
