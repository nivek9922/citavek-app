import Image from 'next/image'
import { MapPin, Phone, Star, Clock, Scissors } from 'lucide-react'
import { getTenantContext } from '@/server/tenant'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers }  from '@/modules/staff/queries'
import { formatCop, formatDuration } from '@/shared/format'
import { Badge }             from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar'
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
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-5 sm:p-7">
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ─── PERFIL DEL NEGOCIO ───────────────────────────────── */}
      <div className="mx-auto max-w-2xl">
        {/* Cover photo — contenida, sin gradientes */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-muted">
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
        </div>

        {/* Identidad — avatar superpuesto + info */}
        <div className="px-5 pb-5">
          {/* Avatar con overlap sobre el borde inferior del cover */}
          <div className="-mt-10 mb-3">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
              {ctx.branding.logoUrl && (
                <AvatarImage src={ctx.branding.logoUrl} alt={ctx.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold font-display">
                {ctx.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <h1 className="font-display text-4xl leading-none tracking-wide sm:text-5xl">
            {ctx.name}
          </h1>

          {ctx.branding.tagline && (
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {ctx.branding.tagline}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {ctx.address ? `${ctx.address}${ctx.city ? `, ${ctx.city}` : ''}` : (ctx.city ?? 'Colombia')}
            </span>
            {ctx.phone && (
              <a
                href={`tel:${ctx.phone}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0" /> {ctx.phone}
              </a>
            )}
          </div>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              Reservas en línea · Sin filas
            </span>
          </div>
        </div>
      </div>

      {/* ─── BOOKING FLOW (focal point) ───────────────────────── */}
      <section id="reservar" className="mx-auto max-w-2xl px-4 pb-6 mt-6">
        <Card className="shadow-xl overflow-hidden">
          <CardContent className="p-5 sm:p-7">
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
          </CardContent>
        </Card>
      </section>

      {/* ─── SERVICIOS ────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader icon={<Scissors className="h-5 w-5 text-primary" />} title="Servicios" />

        <Card className="mt-5 overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
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
          </CardContent>
        </Card>
      </section>

      {/* ─── EQUIPO ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-4 pb-16">
        <SectionHeader icon={<Star className="h-5 w-5 text-primary" />} title="Nuestro equipo" />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {barbers.map((b) => (
            <Card
              key={b.id}
              className="hover:border-primary/40 hover:shadow-elegant transition-smooth"
            >
              <CardContent className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <Avatar className="h-14 w-14 shrink-0">
                  {b.avatarUrl && (
                    <AvatarImage src={b.avatarUrl} alt={b.displayName} />
                  )}
                  <AvatarFallback className="text-xl font-bold">
                    {b.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

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
              </CardContent>
            </Card>
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
          Powered by <span className="font-semibold">BookingFlow</span>
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
