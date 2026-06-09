'use client'
import { useState } from 'react'
import { type AdminOrgRow } from '@/modules/tenancy/queries'
import { OrgList }            from '@/modules/tenancy/ui/OrgList'
import { CreateBarberiaForm } from '@/modules/identity/ui/CreateBarberiaForm'

interface Props {
  initialOrgs: AdminOrgRow[]
}

export function AdminOrgsSection({ initialOrgs }: Props) {
  const [orgs, setOrgs] = useState(initialOrgs)

  function onStatusChange(orgId: string, newStatus: 'active' | 'suspended') {
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, status: newStatus } : o)))
  }

  function onDelete(orgId: string) {
    setOrgs((prev) => prev.filter((o) => o.id !== orgId))
  }

  function onCreated(data: { id: string; slug: string; name: string; city: string; primaryColor: string }) {
    const newOrg: AdminOrgRow = {
      id:           data.id,
      name:         data.name,
      slug:         data.slug,
      city:         data.city,
      status:       'active',
      createdAt:    new Date(),
      branding:     { primaryColor: data.primaryColor },
      _count:        { barbers: 0, appointments: 0 },
      appointments: [],
    }
    setOrgs((prev) => [newOrg, ...prev])
  }

  return (
    <>
      <OrgList orgs={orgs} onStatusChange={onStatusChange} onDelete={onDelete} />

      <section>
        <h2 className="mb-4 text-xl font-bold">Crear barbería</h2>
        <div className="rounded-2xl border border-border bg-card p-6">
          <CreateBarberiaForm onCreated={onCreated} />
        </div>
      </section>
    </>
  )
}
