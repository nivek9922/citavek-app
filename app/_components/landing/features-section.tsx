import {
  CalendarDays,
  Globe,
  Users,
  Smartphone,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const features = [
  {
    icon: CalendarDays,
    title: 'Agenda digital',
    description: 'Vista diaria y semanal de todas las citas. Sin papel, sin desorden.',
  },
  {
    icon: Globe,
    title: 'Motor de reservas online',
    description: 'Tu propia página donde los clientes eligen y reservan en segundos, 24/7.',
  },
  {
    icon: Users,
    title: 'Gestión de barberos',
    description: 'Asigna servicios, define horarios y controla el rendimiento de cada uno.',
  },
  {
    icon: Smartphone,
    title: 'Vista móvil (PWA)',
    description: 'Tus clientes instalan la app directamente desde el navegador — sin App Store.',
  },
  {
    icon: MessageCircle,
    title: 'Recordatorios por WhatsApp',
    description: 'Reduce no-shows enviando confirmaciones directamente por WhatsApp.',
  },
  {
    icon: TrendingUp,
    title: 'Métricas del negocio',
    description: 'Citas por día, ingresos estimados, servicios más populares y más.',
  },
] as const

export function FeaturesSection() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Qué incluye
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            Todo lo que tu barbería <span className="text-primary">necesita.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Una sola herramienta para gestionar tu negocio de principio a fin.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 80}>
              <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:bg-card/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                <div className="mb-4 inline-flex rounded-xl border border-border bg-background p-3 transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                  <feature.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <h3 className="mb-1.5 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
