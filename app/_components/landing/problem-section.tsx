import { MessageSquare, UserX, BarChart2 } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const problems = [
  {
    icon: MessageSquare,
    title: 'Agenda en papel o WhatsApp',
    description:
      'Responder mensajes todo el día, perder reservas entre chats y no tener claridad de quién viene y a qué hora.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
  {
    icon: UserX,
    title: 'No-shows sin aviso',
    description:
      'Clientes que no llegan y no avisan. Tiempo perdido, sillas vacías y un día que pudo rendir mucho más.',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  {
    icon: BarChart2,
    title: 'Sin control del negocio',
    description:
      'Al final del día no sabes exactamente cuánto generaste, cuál servicio se vendió más ni qué barbero rindió mejor.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
  },
] as const

export function ProblemSection() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            El problema
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            ¿Te suena <span className="text-primary">familiar?</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Estos son los dolores reales de cada dueño de barbería antes de usar Citavek.
          </p>
        </ScrollReveal>

        <div className="grid gap-6 sm:grid-cols-3">
          {problems.map((problem, i) => (
            <ScrollReveal key={problem.title} delay={i * 100}>
              <div
                className={`rounded-2xl border ${problem.border} ${problem.bg} p-6 transition-transform duration-300 hover:-translate-y-1`}
              >
                <div className={`mb-4 inline-flex rounded-xl border ${problem.border} ${problem.bg} p-3`}>
                  <problem.icon className={`h-6 w-6 ${problem.color}`} />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{problem.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{problem.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
