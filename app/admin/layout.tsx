import { requireSuperAdmin } from '@/server/super-admin'
import { signOutAction }     from '@/modules/identity/actions'

export const metadata = { title: 'Super Admin — BookingFlow' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin()

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
            <span className="text-xs text-muted-foreground">{session.user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
