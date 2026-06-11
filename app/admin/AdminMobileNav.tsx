'use client'

import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'
import { AdminNavLinks } from './AdminNavLinks'

export function AdminMobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="rounded-lg border border-border p-2 md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-56 p-0">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <SheetDescription className="sr-only">
          Navegación principal del panel de Súper Admin.
        </SheetDescription>
        <div className="px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Plataforma
          </p>
        </div>
        <AdminNavLinks />
      </SheetContent>
    </Sheet>
  )
}
