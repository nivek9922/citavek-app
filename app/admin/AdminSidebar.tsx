import { Suspense } from 'react'
import { AdminNavLinks } from './AdminNavLinks'

export function AdminSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
      <div className="px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plataforma
        </p>
      </div>
      {/* usePathname() es dato de request en rutas dinámicas ([id]); con Cache
          Components debe ir dentro de un <Suspense> para prerenderizar el shell. */}
      <Suspense fallback={<NavFallback />}>
        <AdminNavLinks />
      </Suspense>
    </aside>
  )
}

function NavFallback() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/30" />
      ))}
    </nav>
  )
}
