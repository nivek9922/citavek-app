import { Suspense }                  from 'react'
import { requireSuperAdmin }          from '@/server/super-admin'
import { listOrganizationsForAdmin }  from '@/modules/tenancy/queries'
import { AdminFilters }               from '../AdminFilters'
import { AdminOrgsSection }           from '../AdminOrgsSection'

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; city?: string }>
}) {
  await requireSuperAdmin()

  const [orgs, { q, status, city }] = await Promise.all([
    listOrganizationsForAdmin(),
    searchParams,
  ])

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

      <div className="space-y-4">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-muted/40" />}>
          <AdminFilters total={orgs.length} filtered={filtered.length} />
        </Suspense>

        <AdminOrgsSection
          key={`${q ?? ''}-${status ?? ''}-${city ?? ''}`}
          initialOrgs={filtered}
        />
      </div>

    </div>
  )
}
