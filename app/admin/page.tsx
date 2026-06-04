import Link from 'next/link'
import { ExternalLink, Users, Scissors, Plus } from 'lucide-react'
import { requireSuperAdmin } from '@/server/super-admin'
import { listOrganizationsForAdmin } from '@/modules/tenancy/queries'
import { CreateBarberiaForm } from '@/modules/identity/ui/CreateBarberiaForm'

export default async function AdminPage() {
  await requireSuperAdmin()

  const orgs = await listOrganizationsForAdmin()

  return (
    <div className="space-y-10">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <KPI label="Barberías activas" value={orgs.filter((o) => o.status === 'active').length} />
        <KPI label="Total barberías"   value={orgs.length} />
        <KPI label="Total barberos"    value={orgs.reduce((s, o) => s + o._count.barbers, 0)} />
      </div>

      {/* Crear nueva barbería */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Crear barbería</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <CreateBarberiaForm />
        </div>
      </section>

      {/* Lista de barberías */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Barberías registradas</h2>
        </div>

        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {orgs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin barberías. Crea la primera arriba.
            </p>
          )}
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-accent/20 transition-smooth">
              {/* Color swatch */}
              <div
                className="h-10 w-10 shrink-0 rounded-xl border border-border"
                style={{ backgroundColor: org.branding?.primaryColor ?? '#E0A300' }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{org.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium
                    ${org.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-destructive/10 text-destructive'}`}>
                    {org.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  /{org.slug} · {org.city ?? 'Sin ciudad'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {org._count.barbers} barberos
                </span>
                <span>{org._count.appointments} citas</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/${org.slug}/panel`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-smooth hover:border-primary/50 hover:text-primary"
                >
                  Panel
                </Link>
                <Link
                  href={`/${org.slug}`}
                  target="_blank"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-smooth hover:border-primary/50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary">{value}</p>
    </div>
  )
}
