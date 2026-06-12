import { KeyRound } from 'lucide-react'
import { requireSuperAdmin } from '@/server/super-admin'
import { ChangePasswordForm } from '@/modules/identity/ui/ChangePasswordForm'

export const metadata = { title: 'Mi cuenta — Super Admin' }

export default async function AdminCuentaPage() {
  await requireSuperAdmin()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las credenciales de acceso al panel de administración.
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
