'use client'

import Link from 'next/link'
import { ArrowRight, Scissors } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/shared/ui/utils'

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, oklch(0.78 0.16 75 / 0.12) 0%, transparent 70%)',
        }}
      />
      {/* Noise texture overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Badge */}
      <div
        className={cn(
          'mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary transition-all duration-700',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4',
        )}
        style={{ transitionDelay: '100ms' }}
      >
        <Scissors className="h-3.5 w-3.5" />
        Software para barberías
      </div>

      {/* Headline */}
      <h1
        className={cn(
          'font-display text-6xl font-normal uppercase leading-none tracking-wide text-foreground transition-all duration-700 sm:text-7xl md:text-8xl lg:text-9xl',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
        style={{ transitionDelay: '200ms' }}
      >
        Tu barbería,{' '}
        <span className="text-primary">siempre</span>
        <br />
        a tiempo.
      </h1>

      {/* Subtitle */}
      <p
        className={cn(
          'mt-6 max-w-xl text-base text-muted-foreground transition-all duration-700 sm:text-lg',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
        style={{ transitionDelay: '350ms' }}
      >
        Citavek es la plataforma de reservas online diseñada para barberías modernas en Colombia. Tu agenda, tu equipo y tus clientes — todo en un solo lugar.
      </p>

      {/* CTAs */}
      <div
        className={cn(
          'mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 transition-all duration-700',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        )}
        style={{ transitionDelay: '500ms' }}
      >
        <Link
          href="/registro"
          className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          Registra tu barbería
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-card hover:-translate-y-0.5 active:translate-y-0"
        >
          Iniciar sesión
        </Link>
      </div>

      {/* Social proof line */}
      <p
        className={cn(
          'mt-8 text-xs text-muted-foreground/60 transition-all duration-700',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDelay: '700ms' }}
      >
        Acceso por código durante el período de lanzamiento
      </p>

      {/* Scroll hint */}
      <div
        className={cn(
          'absolute bottom-8 flex flex-col items-center gap-1.5 transition-all duration-700',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDelay: '900ms' }}
      >
        <span className="text-xs text-muted-foreground/40 uppercase tracking-widest">Scroll</span>
        <div className="h-8 w-px animate-bounce bg-linear-to-b from-primary/40 to-transparent" />
      </div>
    </section>
  )
}
