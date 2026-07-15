import Link                          from 'next/link'
import { Suspense }                  from 'react'
import { AlertTriangle }             from 'lucide-react'
import { requireSuperAdmin }          from '@/server/super-admin'
import { listOrganizationsForAdmin }  from '@/modules/tenancy/queries'
import { getTenantsPerformance }      from '@/modules/analytics/queries'
import { TenantsPerformanceTable }    from '@/modules/analytics/ui/TenantsPerformanceTable'
import { AdminFilters }               from '../AdminFilters'
import { AdminOrgsSection }           from '../AdminOrgsSection'

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string; sort?: string }>
}) {
  await requireSuperAdmin()

  const [{ orgs, total: totalOrgs }, { rows: performance, total: totalPerformance }, { q, status, city, sort }] = await Promise.all([
    listOrganizationsForAdmin(),
    getTenantsPerformance(),
    searchParams,
  ])

  // El banner solo se muestra si el take:1000 realmente truncó algo — no es
  // paginación real, solo una alerta de que el listado in-memory (filtros
  // q/status/city) ya no representa el 100% de las orgs.
  const truncated = totalOrgs > 1000 || totalPerformance > 1000

  // Churn por org (de listOrganizationsForAdmin) para la columna + orden de la tabla.
  const churnByOrg = new Map(orgs.map((o) => [o.id, o.churn]))
  const sortedPerformance = sort === 'churn'
    ? [...performance].sort((a, b) => (churnByOrg.get(b.id)?.score ?? 0) - (churnByOrg.get(a.id)?.score ?? 0))
    : performance   // ya viene ordenado por volumen de citas desc

  const filtered = orgs.filter((o) => {
    const query = (q ?? '').trim().toLowerCase()
    if (query && !o.name.toLowerCase().includes(query) && !o.slug.toLowerCase().includes(query)) return false
    if (status && status !== 'all' && o.status !== status) return false
    if (city   && city   !== 'all' && o.city   !== city)   return false
    return true
  })

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Negocios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona todas las cuentas registradas en la plataforma.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Rendimiento por negocio</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Telemetría de los últimos 30 días. Click en una fila para ver el detalle de la barbería.
            </p>
          </div>
          <div className="flex w-fit gap-0.5 rounded-lg border border-border p-0.5 text-xs">
            <Link
              href="?sort=activity"
              className={`rounded-md px-3 py-1 ${sort !== 'churn' ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Más activos
            </Link>
            <Link
              href="?sort=churn"
              className={`rounded-md px-3 py-1 ${sort === 'churn' ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mayor churn
            </Link>
          </div>
        </div>
        <TenantsPerformanceTable rows={sortedPerformance} churnByOrg={churnByOrg} />
      </section>

      <div className="space-y-4">
        {truncated && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-sm text-orange-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Mostrando los primeros 1000 de {Math.max(totalOrgs, totalPerformance)} negocios registrados.
              Usa la búsqueda para acotar resultados.
            </span>
          </div>
        )}
        <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-muted/40" />}>
          <AdminFilters total={orgs.length} filtered={filtered.length} />
        </Suspense>

        <AdminOrgsSection
          key={`${q ?? ''}-${status ?? ''}-${city ?? ''}-${filtered.length}`}
          initialOrgs={filtered}
        />
      </div>

    </div>
  )
}
