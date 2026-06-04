'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Scissors, Users, Palette, Contact, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/ui/utils'

interface NavItem {
  label: string
  href:  string
  icon:  LucideIcon
  roles?: string[]
}

const NAV: NavItem[] = [
  { label: 'Agenda',    href: '',           icon: Calendar },
  { label: 'Clientes',  href: '/clientes',  icon: Contact },
  { label: 'Servicios', href: '/servicios', icon: Scissors },
  { label: 'Equipo',    href: '/equipo',    icon: Users },
  { label: 'Marca',     href: '/marca',     icon: Palette, roles: ['owner'] },
]

export function PanelNav({
  slug,
  role,
  variant,
}: {
  slug: string
  role: string
  variant: 'sidebar' | 'tabs'
}) {
  const pathname = usePathname()
  const base  = `/${slug}/panel`
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role))

  const isActive = (href: string) =>
    href === '' ? pathname === base : pathname.startsWith(`${base}${href}`)

  if (variant === 'sidebar') {
    return (
      <nav className="flex flex-col gap-1 px-3">
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={`${base}${href}`}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-smooth',
              isActive(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    )
  }

  // variant === 'tabs' (mobile)
  return (
    <nav className="-mb-px flex gap-0 overflow-x-auto">
      {items.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={`${base}${href}`}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-smooth',
            isActive(href)
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
