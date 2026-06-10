import { AdminNavLinks } from './AdminNavLinks'

export function AdminSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plataforma
        </p>
      </div>
      <AdminNavLinks />
    </aside>
  )
}
