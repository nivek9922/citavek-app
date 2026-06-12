import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const WA_NUMBER = '573026889618'

export function CtaSection() {
  return (
    <section className="relative overflow-hidden px-4 py-32">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-125 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse, oklch(0.78 0.16 75 / 0.08) 0%, transparent 65%)',
        }}
      />

      <div className="mx-auto max-w-3xl text-center">
        <ScrollReveal>
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Empieza hoy
          </span>
          <h2 className="font-display text-5xl font-normal uppercase leading-tight tracking-wide text-foreground sm:text-6xl md:text-7xl">
            ¿Listo para modernizar{' '}
            <span className="text-primary">tu barbería?</span>
          </h2>
          <p className="mt-6 text-base text-muted-foreground sm:text-lg">
            Únete a las barberías que ya están usando Citavek. Acceso por código durante el período de lanzamiento — escríbenos para solicitar el tuyo.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/registro"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            Registra tu barbería
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hola%2C%20quiero%20solicitar%20mi%20c%C3%B3digo%20de%20acceso%20a%20Citavek`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-8 py-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-card hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 text-green-400" />
            Solicitar código de acceso
          </a>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <p className="mt-6 text-xs text-muted-foreground/50">
            Acceso exclusivo por código durante el lanzamiento · Sin tarjeta de crédito
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
