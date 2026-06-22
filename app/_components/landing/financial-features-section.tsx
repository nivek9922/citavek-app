import { Trophy, Wallet, ShieldAlert } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const features = [
  {
    icon: Trophy,
    title: 'Programa de fidelidad',
    description:
      'Configura cada cuántas citas tu cliente recibe una recompensa. Se motivan a volver, no a probar la competencia.',
  },
  {
    icon: Wallet,
    title: 'Comisiones y cierre de caja',
    description:
      'Define el % de cada barbero y el sistema calcula cuánto pagarle. Sin calculadora, sin Excel, sin errores.',
  },
  {
    icon: ShieldAlert,
    title: 'Control de no-shows',
    description:
      'Identifica clientes que no llegan sin avisar. Tú decides qué hacer — el sistema solo te avisa.',
    anchorId: 'no-shows',
  },
] as const

export function FinancialFeaturesSection() {
  return (
    <section className="px-4 pb-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Más que una agenda
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            No solo agendas — <span className="text-primary">retienes y controlas.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Las herramientas que convierten tu barbería en un negocio que crece y se cuida solo.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 80}>
              <div
                id={'anchorId' in feature ? feature.anchorId : undefined}
                className="sf-hover-lift group h-full scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sf-card transition-smooth hover:border-primary/40"
              >
                <div className="mb-4 inline-flex rounded-xl bg-muted p-3 transition-colors group-hover:bg-primary/10">
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
