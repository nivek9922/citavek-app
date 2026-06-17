'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/shared/ui/utils'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border bg-background/85 shadow-sf-card backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display text-2xl font-normal uppercase tracking-[0.18em] text-primary"
        >
          Citavek
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="sf-hover-lift rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sf-selected transition-all hover:brightness-105"
          >
            Registrarse
          </Link>
        </div>
      </nav>
    </header>
  )
}
