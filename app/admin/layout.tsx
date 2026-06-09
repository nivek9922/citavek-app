import { Suspense } from 'react'
import { requireSuperAdmin } from '@/server/super-admin'
import { signOutAction }     from '@/modules/identity/actions'

export const metadata = { title: 'Super Admin — BookingFlow' }

// Layout NO async: el chrome es shell estático. La barra de usuario depende de la
// sesión (headers) → se resuelve en streaming dentro de <Suspense>. El gate real
// (requireSuperAdmin) vive además en la página, que es la que protege los datos.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-primary">BookingFlow</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Suspense fallback={<span className="text-xs text-muted-foreground">…</span>}>
              <AdminUserBar />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}

async function AdminUserBar() {
  const session = await requireSuperAdmin()
  return (
    <>
      <span className="text-xs text-muted-foreground">{session.user.email}</span>
      <form action={signOutAction}>
        <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
          Cerrar sesión
        </button>
      </form>
    </>
  )
}
