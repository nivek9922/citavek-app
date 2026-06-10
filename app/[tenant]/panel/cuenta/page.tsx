import { KeyRound } from 'lucide-react'
import { getTenantContext }  from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  return { title: `Mi cuenta — ${tenant}` }
}

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  await requireMembership(ctx.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las credenciales de acceso a tu panel.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Cambiar contraseña</h2>
        </div>
        <ChangePasswordForm />
      </section>
    </div>
  )
}
