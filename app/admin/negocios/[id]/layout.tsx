import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireSuperAdmin } from '@/server/super-admin'
import { getOrgForAdmin } from '@/modules/tenancy/queries'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { OrgDetailHeaderActions } from './OrgDetailHeaderActions'

function statusBadge(status: 'active' | 'suspended', createdAt: Date) {
  if (status === 'suspended') {
    return { label: 'Suspendido', cls: 'bg-destructive/10 text-destructive border-destructive/20' }
  }
  const ageDays = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
  if (ageDays <= 14) {
    return { label: 'Nuevo', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
  }
  return { label: 'Activo', cls: 'bg-green-500/10 text-green-400 border-green-500/20' }
}

export default async function NegocioDetalleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params:   Promise<{ id: string }>
}) {
  await requireSuperAdmin()
  const { id } = await params

  // Valida el id de la URL contra la BD antes de renderizar cualquier sección.
  const org = await getOrgForAdmin(id)
  if (!org) notFound()

  const badge = statusBadge(org.status, org.createdAt)

  return (
    <div className="space-y-8">
      <Link
        href="/admin/negocios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a Negocios
      </Link>

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-2xl border border-border">
            {org.branding?.logoUrl && <AvatarImage src={org.branding.logoUrl} alt={org.name} className="rounded-2xl object-cover" />}
            <AvatarFallback
              style={{ backgroundColor: org.branding?.primaryColor ?? '#E0A300' }}
              className="rounded-2xl text-white font-bold text-lg"
            >
              {org.name[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
              <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0 ${badge.cls}`}>
                {badge.label}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">/{org.slug}</p>
          </div>
        </div>

        <OrgDetailHeaderActions orgId={org.id} status={org.status} phone={org.phone} slug={org.slug} />
      </header>

      {children}
    </div>
  )
}
