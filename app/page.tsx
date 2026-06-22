import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LandingNav } from './_components/landing/landing-nav'
import { HeroSection } from './_components/landing/hero-section'
import { ProblemSection } from './_components/landing/problem-section'
import { HowItWorksSection } from './_components/landing/how-it-works-section'
import { FeaturesSection } from './_components/landing/features-section'
import { FinancialFeaturesSection } from './_components/landing/financial-features-section'
import { DifferentiatorsSection } from './_components/landing/differentiators-section'
import { CtaSection } from './_components/landing/cta-section'
import { FooterYear } from './_components/landing/footer-year'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://citavek.com'

export const metadata: Metadata = {
  title: 'Citavek — Reservas online y gestión para barberías',
  description:
    'Citavek es la plataforma de reservas online diseñada para barberías modernas en Colombia. Agenda digital, motor de reservas, programa de fidelidad, comisiones y cierre de caja — retén clientes y controla tus números en un solo lugar.',
  openGraph: {
    type: 'website',
    url: APP_URL,
    title: 'Citavek — Reservas online para barberías',
    description:
      'Tu agenda, tus clientes y tu equipo — todo en un solo panel. Reservas online para barberías modernas en Colombia.',
    siteName: 'Citavek',
    locale: 'es_CO',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Citavek — Reservas online para barberías',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Citavek — Reservas online para barberías',
    description:
      'Tu agenda, tus clientes y tu equipo — todo en un solo panel. Reservas online para barberías modernas en Colombia.',
    images: ['/opengraph-image'],
  },
}

export default function HomePage() {
  return (
    <div className="storefront">
      <LandingNav />
      <main className="bg-background text-foreground antialiased">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <FinancialFeaturesSection />
        <DifferentiatorsSection />
        <CtaSection />

        <footer className="border-t border-border px-4 py-10 text-center text-xs text-ink-faint">
          © <Suspense fallback="2026"><FooterYear /></Suspense> Citavek · Software para barberías en Colombia
        </footer>
      </main>
    </div>
  )
}
