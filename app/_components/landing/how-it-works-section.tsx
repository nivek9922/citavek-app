import { UserPlus, Link2, LayoutDashboard } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Crea tu perfil de barbería',
    description:
      'Registra tu negocio en minutos. Agrega tus servicios, precios, barberos y horarios de atención.',
  },
  {
    number: '02',
    icon: Link2,
    title: 'Tus clientes reservan online',
    description:
      'Comparte tu link único. Tus clientes eligen servicio, barbero, fecha y hora — sin llamadas ni mensajes.',
  },
  {
    number: '03',
    icon: LayoutDashboard,
    title: 'Tú gestionas todo desde el panel',
    description:
      'Ve tu agenda del día, confirma o cancela citas, revisa métricas y controla tu negocio desde cualquier dispositivo.',
  },
] as const

export function HowItWorksSection() {
  return (
    <section className="bg-card/50 px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Cómo funciona
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            Tres pasos y <span className="text-primary">listo.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            De cero a tu barbería online en menos de 10 minutos.
          </p>
        </ScrollReveal>

        <div className="relative grid gap-8 sm:grid-cols-3">
          {/* Connecting line — desktop only */}
          <div
            aria-hidden
            className="absolute left-[16.6%] right-[16.6%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent sm:block"
          />

          {steps.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 120} className="relative text-center">
              {/* Step number circle */}
              <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <span className="font-display text-2xl font-normal text-primary">{step.number}</span>
                <div className="absolute inset-0 rounded-full bg-primary/5 blur-md" />
              </div>

              <div className="mb-3 flex justify-center">
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
