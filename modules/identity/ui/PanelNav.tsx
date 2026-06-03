'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/ui/utils'

interface NavItem { label: string; href: string; roles?: string[] }

const NAV: NavItem[] = [
  { label: 'Agenda',    href: '' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Equipo',    href: '/equipo' },
  { label: 'Marca',     href: '/marca', roles: ['owner'] },
]

export function PanelNav({ slug, role }: { slug: string; role: string }) {
  const pathname = usePathname()
  const base = `/${slug}/panel`

  return (
    <nav className="-mb-px flex gap-0 overflow-x-auto">
      {NAV.filter((n) => !n.roles || n.roles.includes(role)).map((item) => {
        const href    = `${base}${item.href}`
        const active  = item.href === ''
          ? pathname === base
          : pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-smooth',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
