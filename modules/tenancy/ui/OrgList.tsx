'use client'

import Link from 'next/link'
import { Building2, ExternalLink, Users, CalendarDays } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge }                  from '@/shared/ui/badge'
import { type AdminOrgRow }       from '@/modules/tenancy/queries'
import { type HealthLevel }       from '@/modules/tenancy/domain/health-score'
import { OrgStatusToggle }        from './OrgStatusToggle'
import { OrgDeleteButton }        from './OrgDeleteButton'

const CHURN_DAYS = 30

const HEALTH_BADGE: Record<HealthLevel, { label: string; cls: string }> = {
  green:      { label: 'Saludable',  cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  yellow:     { label: 'Moderada',   cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  red:        { label: 'En riesgo',  cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  onboarding: { label: 'Nuevo',      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

interface Props {
  orgs:           AdminOrgRow[]
  onStatusChange: (orgId: string, newStatus: 'active' | 'suspended') => void
  onDelete:       (orgId: string) => void
}

export function OrgList({ orgs, onStatusChange, onDelete }: Props) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Negocios</h2>
        <span className="ml-auto text-xs text-muted-foreground">{orgs.length} en total</span>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {orgs.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Sin negocios registrados</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Crea el primer negocio usando el formulario de abajo.</p>
          </div>
        )}

        {orgs.map((org) => {
          const lastApt = org.appointments[0]?.startAt
          const isChurn = org.status === 'active'
            && daysSince(org.createdAt) > CHURN_DAYS
            && (!lastApt || daysSince(lastApt) > CHURN_DAYS)
          const daysAgo = lastApt ? daysSince(lastApt) : null
          const healthBadge = HEALTH_BADGE[org.health.level]

          return (
            <div key={org.id} className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-accent/20 transition-smooth">
              <Avatar className="h-10 w-10 shrink-0 rounded-xl border border-border">
                <AvatarFallback
                  style={{ backgroundColor: org.branding?.primaryColor ?? '#E0A300' }}
                  className="rounded-xl text-white font-bold text-sm"
                >
                  {org.name[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold">{org.name}</p>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium px-2 py-0 ${
                      org.status === 'active'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}
                  >
                    {org.status === 'active' ? 'activa' : 'suspendida'}
                  </Badge>

                  {isChurn && (
                    <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 bg-orange-500/10 text-orange-400 border-orange-500/20">
                      sin actividad
                    </Badge>
                  )}

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium px-2 py-0 ${healthBadge.cls}`}
                    title={`+${org.health.created} creadas / −${org.health.cancelled} canceladas (7d)`}
                  >
                    {healthBadge.label}
                  </Badge>
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  /{org.slug}
                  {org.city ? ` · ${org.city}` : ''}
                  {daysAgo !== null ? ` · última cita hace ${daysAgo}d` : ' · sin citas aún'}
                </p>
              </div>

              <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                <span className="flex items-center gap-1" title="Profesionales">
                  <Users className="h-3.5 w-3.5" /> {org._count.barbers}
                </span>
                <span className="flex items-center gap-1" title="Citas totales">
                  <CalendarDays className="h-3.5 w-3.5" /> {org._count.appointments}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <OrgStatusToggle orgId={org.id} status={org.status} onStatusChange={onStatusChange} />
                <Link
                  href={`/${org.slug}/panel`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs transition-smooth hover:border-primary/50 hover:text-primary"
                >
                  Panel
                </Link>
                <Link
                  href={`/${org.slug}`}
                  target="_blank"
                  className="rounded-lg border border-border p-1.5 text-xs transition-smooth hover:border-primary/50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <OrgDeleteButton
                  orgId={org.id}
                  slug={org.slug}
                  name={org.name}
                  appointments={org._count.appointments}
                  barbers={org._count.barbers}
                  onDelete={onDelete}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
