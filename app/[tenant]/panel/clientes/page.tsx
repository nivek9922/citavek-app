import Link from 'next/link'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { listCustomers } from '@/modules/customers/queries'
import { formatCop } from '@/shared/format'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'

export default async function ClientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { tenant: slug } = await params
  const { q } = await searchParams
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  const customers = await listCustomers(ctx.id, q)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${customers.length} ${customers.length === 1 ? 'cliente' : 'clientes'}`}
      />

      {/* Búsqueda — form nativo GET (URL state, sin JS de cliente) */}
      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre o teléfono…"
          className="pl-9"
          aria-label="Buscar clientes"
        />
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon="🧑"
          title={q ? 'Sin resultados' : 'Aún no hay clientes'}
          description={
            q
              ? 'Prueba con otro nombre o teléfono.'
              : 'Los clientes se crean automáticamente cuando alguien reserva una cita.'
          }
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/${slug}/panel/clientes/${c.id}`}
              className="flex items-center gap-4 bg-card px-5 py-3.5 transition-smooth hover:bg-accent/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <div className="hidden flex-col items-end text-xs text-muted-foreground sm:flex">
                <span>{c.totalAppointments} {c.totalAppointments === 1 ? 'cita' : 'citas'}</span>
                {c.lastVisit && (
                  <span>Última: {format(new Date(c.lastVisit), 'd MMM', { locale: es })}</span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-primary">{formatCop(c.totalSpent)}</p>
                <p className="text-[10px] text-muted-foreground">gastado</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
