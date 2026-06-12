import { MessageCircle } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const WA_NUMBER = '573001234567' // TODO: reemplazar con número real de contacto

export function SocialProofSection() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="mb-16 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
            Comunidad
          </span>
          <h2 className="font-display text-4xl font-normal uppercase tracking-wide text-foreground sm:text-5xl">
            Somos el período <span className="text-primary">de lanzamiento.</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Citavek está en acceso anticipado. Las primeras barberías que entren ahora ayudan a
            moldear el producto — y acceden gratis mientras dure esta etapa.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-2 font-semibold text-foreground">
              ¿Ya usas Citavek? Cuéntanos tu experiencia.
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Tu testimonio ayuda a otros dueños de barbería a tomar la decisión. Escríbenos por WhatsApp.
            </p>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=Hola%2C%20quiero%20compartir%20mi%20experiencia%20usando%20Citavek`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar mi testimonio
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
