import { MapPin, Gift, Link2, Sparkles } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const items = [
  {
    icon: MapPin,
    title: 'Hecho para Colombia y Latinoamérica',
    description:
      'Precios en COP, zona horaria correcta, flujos adaptados a cómo trabajan realmente las barberías acá.',
  },
  {
    icon: Gift,
    title: 'Acceso por código durante el lanzamiento',
    description:
      'Sin tarjeta de crédito, sin contratos. Entramos primero con barberías seleccionadas para construir algo que realmente funcione.',
  },
  {
    icon: Link2,
    title: 'Tu propia URL de reservas',
    description:
      'citavek.app/tu-barberia — una dirección profesional que puedes poner en tu Instagram, WhatsApp y tarjeta.',
  },
  {
    icon: Sparkles,
    title: 'Diseño premium que tus clientes van a querer usar',
    description:
      'Una experiencia de reserva que proyecta la misma calidad que tu trabajo. No una app genérica.',
  },
] as const

export function DifferentiatorsSection() {
  return (
    <section className="bg-card/50 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Por qué Citavek
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            No es otra agenda <span className="text-primary">genérica.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Diseñado específicamente para las barberías de nuestra región, no adaptado de otro mercado.
          </p>
        </ScrollReveal>

        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="flex gap-4 rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1.5 font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
