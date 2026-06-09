'use client'

import Link from 'next/link'
import { Scissors, ExternalLink, Users, CalendarDays } from 'lucide-react'
import { type AdminOrgRow } from '@/modules/tenancy/queries'
import { type HealthLevel } from '@/modules/tenancy/domain/health-score'
import { OrgStatusToggle } from './OrgStatusToggle'
import { OrgDeleteButton }  from './OrgDeleteButton'

const CHURN_DAYS = 30

const HEALTH_BADGE: Record<HealthLevel, { label: string; cls: string }> = {
  green:  { label: 'saludable', cls: 'bg-green-500/10 text-green-400' },
  yellow: { label: 'moderada',  cls: 'bg-yellow-500/10 text-yellow-400' },
  red:    { label: 'en riesgo', cls: 'bg-destructive/10 text-destructive' },
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
        <Scissors className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Barberías</h2>
        <span className="ml-auto text-xs text-muted-foreground">{orgs.length} en total</span>
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
        {orgs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin barberías registradas.</p>
        )}

        {orgs.map((org) => {
          const lastApt = org.appointments[0]?.startAt
          const isChurn = org.status === 'active'
            && daysSince(org.createdAt) > CHURN_DAYS
            && (!lastApt || daysSince(lastApt) > CHURN_DAYS)
          const daysAgo = lastApt ? daysSince(lastApt) : null

          return (
            <div key={org.id} className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-accent/20 transition-smooth">
              <div
                className="h-10 w-10 shrink-0 rounded-xl border border-border"
                style={{ backgroundColor: org.branding?.primaryColor ?? '#E0A300' }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{org.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    org.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {org.status === 'active' ? 'activa' : 'suspendida'}
                  </span>
                  {isChurn && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                      sin actividad
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${HEALTH_BADGE[org.health.level].cls}`}
                    title={`+${org.health.created} creadas / −${org.health.cancelled} canceladas (7d)`}
                  >
                    {HEALTH_BADGE[org.health.level].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  /{org.slug}
                  {org.city ? ` · ${org.city}` : ''}
                  {daysAgo !== null ? ` · última cita hace ${daysAgo}d` : ' · sin citas aún'}
                </p>
              </div>

              <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {org._count.barbers}
                </span>
                <span className="flex items-center gap-1">
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
