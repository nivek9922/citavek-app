import { requireSuperAdmin }        from '@/server/super-admin'
import { listAccessCodesAction }    from '@/modules/identity/actions'
import { AdminAccessCodesSection }  from '../AdminAccessCodesSection'

export default async function CodigosPage() {
  await requireSuperAdmin()

  const codes = await listAccessCodesAction()

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Códigos de acceso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera y gestiona invitaciones para que nuevos negocios se registren.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <AdminAccessCodesSection initialCodes={codes} />
      </div>

    </div>
  )
}
