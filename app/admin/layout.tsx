import { Suspense }        from 'react'
import { requireSuperAdmin } from '@/server/super-admin'
import { signOutAction }     from '@/modules/identity/actions'
import { AdminSidebar }      from './AdminSidebar'

export const metadata = { title: 'Super Admin — BookingFlow' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header ── branding + sesión */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
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
      </header>

      {/* Body ── sidebar + contenido */}
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

async function AdminUserBar() {
  const session = await requireSuperAdmin()
  return (
    <>
      <span className="text-xs text-muted-foreground">{session.user.email}</span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
        >
          Cerrar sesión
        </button>
      </form>
    </>
  )
}
