import Link from 'next/link'
import { Suspense } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getTenantContext } from '@/server/tenant'
import { requirePermission } from '@/server/auth-guards'
import { listCustomers } from '@/modules/customers/queries'
import { formatCop } from '@/shared/format'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { CustomerSearch } from '@/modules/customers/ui/CustomerSearch'
import { CustomerPagination } from '@/modules/customers/ui/CustomerPagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

export default async function ClientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { tenant: slug } = await params
  const { q, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const ctx = await getTenantContext(slug)
  await requirePermission(ctx.id, 'customer:read')

  const { items: customers, total } = await listCustomers(ctx.id, q, page)
  const totalPages = Math.max(1, Math.ceil(total / 15))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${total} ${total === 1 ? 'cliente' : 'clientes'}`}
      />

      {/* CustomerSearch usa useSearchParams() → requiere un límite de Suspense
          para no degradar toda la ruta a renderizado en cliente. */}
      <Suspense fallback={<div className="h-10 rounded-xl border border-border bg-muted/40" />}>
        <CustomerSearch slug={slug} initialQuery={q ?? ''} />
      </Suspense>

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
        <>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Citas</TableHead>
                  <TableHead className="hidden sm:table-cell">Última visita</TableHead>
                  <TableHead className="text-right">Total gastado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-accent/30">
                    <TableCell>
                      <Link
                        href={`/${slug}/panel/clientes/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {c.totalAppointments} {c.totalAppointments === 1 ? 'cita' : 'citas'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {c.lastVisit
                        ? format(new Date(c.lastVisit), 'd MMM yyyy', { locale: es })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary text-sm">
                      {formatCop(c.totalSpent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Suspense fallback={null}>
              <CustomerPagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                slug={slug}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  )
}
