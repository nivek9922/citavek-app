import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'
import { supportWhatsAppLink } from '@/shared/constants/billing'

const WHATSAPP_HREF = supportWhatsAppLink(
  'Hola, quiero solicitar el código de acceso para registrar mi barbería en Citavek 💈',
)

export function CtaSection() {
  return (
    <section className="relative overflow-hidden px-4 py-32">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-125 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse, color-mix(in oklab, var(--primary) 8%, transparent) 0%, transparent 65%)',
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
            Únete a las barberías que ya están usando Citavek. El acceso es por código durante el lanzamiento — escríbenos por WhatsApp y te lo damos.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="sf-hover-lift group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-sf-selected transition-all hover:brightness-105 sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Solicitar código por WhatsApp
          </a>
          <Link
            href="/registro"
            className="sf-hover-lift group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-sm font-medium text-foreground shadow-sf-card transition-all hover:border-primary/40 sm:w-auto"
          >
            Ya tengo código — Registrarme
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
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
