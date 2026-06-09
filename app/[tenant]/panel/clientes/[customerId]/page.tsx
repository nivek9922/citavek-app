import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Phone, Mail, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { getCustomerDetail } from '@/modules/customers/queries'
import { formatCop } from '@/shared/format'
import { EmptyState } from '@/shared/ui/empty-state'
import { CustomerNotes } from '@/modules/customers/ui/CustomerNotes'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada', completed: 'Completada',
  cancelled: 'Cancelada', no_show: 'No llegó', pending: 'Pendiente',
}
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-primary',
  completed: 'text-green-400',
  cancelled: 'text-destructive',
  no_show:   'text-orange-400',
  pending:   'text-yellow-400',
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; customerId: string }>
}) {
  const { tenant: slug, customerId } = await params
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const detail = await getCustomerDetail(ctx.id, customerId)
  if (!detail) notFound()

  const { customer, appointments, totalSpent, completed } = detail

  return (
    <div className="space-y-6">
      <Link
        href={`/${slug}/panel/clientes`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-smooth hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      {/* Cabecera del cliente */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-wide sm:text-3xl">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>
            {customer.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Citas totales" value={String(appointments.length)} />
        <Stat label="Completadas"   value={String(completed)} />
        <Stat label="Total gastado" value={formatCop(totalSpent)} highlight />
      </div>

      {/* Notas internas */}
      <CustomerNotes slug={slug} customerId={customerId} initialNotes={customer.notes ?? null} />

      {/* Historial */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarCheck className="h-4 w-4" /> Historial
        </h2>
        {appointments.length === 0 ? (
          <EmptyState icon="📋" title="Sin citas registradas" />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {appointments.map((a) => (
              <div key={a.id} className="flex items-center gap-4 bg-card px-5 py-3">
                <div className="w-24 shrink-0 text-sm">
                  <p className="font-medium">{format(new Date(a.startAt), 'd MMM yyyy', { locale: es })}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.startAt), 'HH:mm')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.barber.nickname ?? a.barber.displayName.split(' ')[0]}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${STATUS_COLOR[a.status] ?? ''}`}>
                  {STATUS_LABEL[a.status]}
                </span>
                <span className="w-20 shrink-0 text-right text-sm font-bold text-primary">
                  {formatCop(a.priceCop)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}
