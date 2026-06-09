import Image from 'next/image'
import { MapPin, Phone, Star, Clock, Scissors } from 'lucide-react'
import { getTenantContext } from '@/server/tenant'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers }  from '@/modules/staff/queries'
import { formatCop, formatDuration } from '@/shared/format'
import { Badge }             from '@/shared/ui/badge'
import { BookingFlow }       from '@/modules/scheduling/ui/BookingFlow'

const CATEGORY_LABELS: Record<string, string> = {
  corte: 'Corte', barba: 'Barba', combo: 'Combo',
  tratamiento: 'Tratamiento', infantil: 'Infantil',
}

export default async function TenantPage({
  params,
  searchParams,
}: {
  params:       Promise<{ tenant: string }>
  searchParams: Promise<{ embed?: string }>
}) {
  const { tenant: slug } = await params
  const { embed }        = await searchParams
  const ctx = await getTenantContext(slug)
  const [services, barbers] = await Promise.all([
    listActiveServices(ctx.id),
    listActiveBarbers(ctx.id),
  ])

  if (embed === '1') {
    return (
      <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card/80 p-5 shadow-card backdrop-blur-sm sm:p-7">
          <div className="mb-5">
            <p className="font-display text-xl tracking-wide">{ctx.name}</p>
            <p className="text-xs text-muted-foreground">Reserva tu cita</p>
          </div>
          <BookingFlow
            tenantSlug={slug}
            services={services}
            barbers={barbers}
            shopName={ctx.name}
            shopPhone={ctx.phone}
            shopAddress={ctx.address}
            timezone={ctx.timezone}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {ctx.branding.coverUrl && (
          <Image
            src={ctx.branding.coverUrl}
            alt=""
            fill
            unoptimized
            priority
            className="object-cover object-center"
          />
        )}
        {/* Glow radial desde el color primario */}
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/60 to-background" />

        <div className="relative mx-auto max-w-3xl px-5 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Star className="h-3 w-3 fill-primary" />
            Reservas en línea · Sin filas
          </span>

          <h1 className="mt-5 font-display text-5xl leading-none tracking-wide sm:text-6xl md:text-7xl">
            {ctx.name}
          </h1>

          {ctx.branding.tagline && (
            <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
              {ctx.branding.tagline}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {ctx.address ? `${ctx.address}${ctx.city ? `, ${ctx.city}` : ''}` : (ctx.city ?? 'Colombia')}
            </span>
            {ctx.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" /> {ctx.phone}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── BOOKING FLOW (focal point) ───────────────────────── */}
      <section id="reservar" className="mx-auto max-w-2xl px-4 pb-6">
        <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-card backdrop-blur-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wide">Reserva tu cita</h2>
            <span className="text-xs text-muted-foreground">
              {services.length} servicios disponibles
            </span>
          </div>
          <BookingFlow
            tenantSlug={slug}
            services={services}
            barbers={barbers}
            shopName={ctx.name}
            shopPhone={ctx.phone}
            shopAddress={ctx.address}
            timezone={ctx.timezone}
          />
        </div>
      </section>

      {/* ─── SERVICIOS ────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <SectionHeader icon={<Scissors className="h-5 w-5 text-primary" />} title="Servicios" />

        <div className="mt-5 divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {services.map((svc, i) => (
            <div key={svc.id} className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-accent/30 transition-smooth">
              {/* Número */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{svc.name}</p>
                  <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5">
                    {CATEGORY_LABELS[svc.category] ?? svc.category}
                  </Badge>
                </div>
                {svc.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{svc.description}</p>
                )}
              </div>

              {/* Duración + precio */}
              <div className="shrink-0 text-right">
                <p className="font-bold text-primary">{formatCop(svc.priceCop)}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDuration(svc.durationMin)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── EQUIPO ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-4 pb-16">
        <SectionHeader icon={<Star className="h-5 w-5 text-primary" />} title="Nuestro equipo" />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-elegant transition-smooth"
            >
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground">
                {b.displayName.charAt(0)}
              </div>

              <div className="min-w-0">
                <p className="font-semibold leading-tight">
                  {b.nickname
                    ? `${b.displayName.split(' ')[0]} "${b.nickname}"`
                    : b.displayName.split(' ').slice(0, 2).join(' ')}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="font-medium">{b.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">· {b.reviewsCount} reseñas</span>
                </div>
                {b.specialties.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {b.specialties.slice(0, 2).map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA bottom ───────────────────────────────────────── */}
      <div className="border-t border-border bg-card/40 py-8 text-center">
        <a
          href="#reservar"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Reservar cita ahora →
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-primary">BookingFlow</span>
        </p>
      </div>

    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <h2 className="font-display text-3xl tracking-wide">{title}</h2>
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  )
}
