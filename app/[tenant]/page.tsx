import { MapPin, Phone, Star, Clock, Scissors } from 'lucide-react'
import { getTenantContext } from '@/server/tenant'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers } from '@/modules/staff/queries'
import { formatCop, formatDuration } from '@/shared/format'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'

const CATEGORY_LABELS: Record<string, string> = {
  corte: 'Corte',
  barba: 'Barba',
  combo: 'Combo',
  tratamiento: 'Tratamiento',
  infantil: 'Infantil',
}

export default async function TenantPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const [services, barbers] = await Promise.all([
    listActiveServices(ctx.id),
    listActiveBarbers(ctx.id),
  ])

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Star className="h-3 w-3 fill-primary" />
            Reserva en línea
          </span>

          <h1 className="mt-4 font-display text-5xl leading-none tracking-wide sm:text-7xl">
            {ctx.name}
          </h1>

          {ctx.branding.tagline && (
            <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
              {ctx.branding.tagline}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {ctx.branding.coverUrl === null && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  Bogotá, Colombia
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  WhatsApp
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Servicios ── */}
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">

        <section>
          <div className="mb-6 flex items-center gap-3">
            <Scissors className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-wide">Servicios</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <Card key={svc.id} className="group cursor-pointer transition-smooth hover:border-primary/40 hover:shadow-elegant">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{svc.name}</p>
                      {svc.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {svc.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {CATEGORY_LABELS[svc.category] ?? svc.category}
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(svc.durationMin)}
                    </span>
                    <span className="font-bold text-primary">
                      {formatCop(svc.priceCop)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Barberos ── */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl tracking-wide">Nuestro Equipo</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber) => (
              <Card key={barber.id} className="group cursor-pointer transition-smooth hover:border-primary/40 hover:shadow-elegant">
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Avatar con inicial si no hay imagen */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground">
                    {barber.displayName.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {barber.nickname
                        ? `${barber.displayName.split(' ')[0]} "${barber.nickname}"`
                        : barber.displayName.split(' ').slice(0, 2).join(' ')}
                    </p>

                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="font-medium text-foreground">{barber.rating.toFixed(1)}</span>
                      <span>· {barber.reviewsCount} reseñas</span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {barber.specialties.slice(0, 2).map((s) => (
                        <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA reserva ── */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center shadow-elegant">
          <h3 className="font-display text-2xl tracking-wide">¿Listo para tu cita?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige tu servicio, barbero y horario en menos de un minuto.
          </p>
          <button className="mt-4 rounded-xl bg-gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90">
            Reservar ahora
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-semibold text-primary">BookingFlow</span>
        </p>
      </main>
    </div>
  )
}
