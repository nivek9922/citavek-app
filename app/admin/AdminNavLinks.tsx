'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, KeyRound } from 'lucide-react'
import { cn } from '@/shared/ui/utils'

const NAV_ITEMS = [
  { href: '/admin',         label: 'Overview',  icon: LayoutDashboard, exact: true  },
  { href: '/admin/negocios', label: 'Negocios',  icon: Building2,       exact: false },
  { href: '/admin/codigos',  label: 'Códigos',   icon: KeyRound,        exact: false },
]

export function AdminNavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
