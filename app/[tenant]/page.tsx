import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MapPin, Phone, Star, Clock, Scissors, Users } from 'lucide-react'
import { getTenantContextPermissive } from '@/server/tenant'
import { canOperate } from '@/modules/subscriptions/domain/subscription'
import { listActiveServices } from '@/modules/catalog/queries'
import { listActiveBarbers }  from '@/modules/staff/queries'
import { getTopReviews }      from '@/modules/reviews/queries'
import { ReviewsSection }     from '@/modules/reviews/ui/ReviewsSection'
import { formatCop, formatDuration } from '@/shared/format'
import { categoryStyle }     from '@/shared/category-style'
import { cn }                from '@/shared/ui/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar'
import { TenantAvatar }      from '@/shared/ui/TenantAvatar'
import { ThemeToggle }       from '@/shared/ui/theme-toggle'
import { BookingFlow }       from '@/modules/scheduling/ui/BookingFlow'
import { EmptyState }        from '@/shared/ui/empty-state'

export default async function TenantPage({
  params,
  searchParams,
}: {
  params:       Promise<{ tenant: string }>
  searchParams: Promise<{ embed?: string }>
}) {
  const { tenant: slug } = await params
  const { embed }        = await searchParams
  const ctx = await getTenantContextPermissive(slug)
  if (!ctx) notFound()

  if (ctx.status === 'suspended') {
    return (
      <div className="storefront flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Scissors className="h-8 w-8 text-ink-faint" />
        </div>
        <h1 className="font-display text-3xl">{ctx.name}</h1>
        <p className="text-lg font-semibold">Temporalmente Inactivo</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Este negocio no está disponible por el momento. Si eres el dueño,
          contacta a soporte para reactivar tu cuenta.
        </p>
      </div>
    )
  }

  // La suscripción (pago/trial) es una compuerta independiente del status manual.
  if (!canOperate(ctx.subscription, new Date())) {
    return (
      <div className="storefront flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Scissors className="h-8 w-8 text-ink-faint" />
        </div>
        <h1 className="font-display text-3xl">{ctx.name}</h1>
        <p className="text-lg font-semibold">No disponible temporalmente</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Este negocio no está disponible temporalmente. Vuelve a intentarlo más tarde.
        </p>
      </div>
    )
  }

  const [services, barbers, reviews] = await Promise.all([
    listActiveServices(ctx.id),
    listActiveBarbers(ctx.id),
    getTopReviews(ctx.id),
  ])

  if (embed === '1') {
    return (
      <div className="storefront flex min-h-screen items-start justify-center bg-background p-0 sm:p-4 sm:pt-6">
        <div className="w-full max-w-lg bg-card sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-sf-card">
          <div className="p-4 sm:p-7">
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
      </div>
    )
  }

  return (
    <div className="storefront min-h-screen bg-background">

      {/* ─── PERFIL DEL NEGOCIO ───────────────────────────────── */}
      <div className="mx-auto max-w-2xl">
        {/* Cover photo — compacta en mobile, sin gradientes */}
        <div className="relative h-40 w-full overflow-hidden bg-muted sm:h-60">
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
          <ThemeToggle className="absolute right-3 top-3 z-10 border-transparent bg-card/70 text-foreground backdrop-blur-sm hover:bg-card/90" />
        </div>

        {/* Identidad — avatar superpuesto + info */}
        <div className="px-5 pb-6">
          {/* Avatar con overlap sobre el borde inferior del cover */}
          <div className="-mt-11 mb-3">
            <TenantAvatar
              name={ctx.name}
              logoUrl={ctx.branding.logoUrl}
              className="h-20 w-20 rounded-2xl ring-4 ring-background shadow-sf-card"
              fallbackClassName="text-2xl"
            />
          </div>

          <h1 className="font-display text-4xl leading-[0.95] tracking-wide sm:text-5xl">
            {ctx.name}
          </h1>

          {ctx.branding.tagline && (
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {ctx.branding.tagline}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-ink-faint" />
              {ctx.address ? `${ctx.address}${ctx.city ? `, ${ctx.city}` : ''}` : (ctx.city ?? 'Colombia')}
            </span>
            {ctx.phone && (
              <a
                href={`tel:${ctx.phone}`}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4 shrink-0 text-ink-faint" /> {ctx.phone}
              </a>
            )}
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sf-card">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              Reservas en línea · Sin filas
            </span>
          </div>
        </div>
      </div>

      {/* ─── BOOKING FLOW (focal point) — full-bleed en mobile ── */}
      <section id="reservar" className="mx-auto mt-2 max-w-2xl px-0 pb-6 sm:mt-6 sm:px-4">
        {/* overflow-hidden solo en sm+: en mobile rompería el position:sticky del
            footer de total (lo dejaría atrapado dentro de la card). */}
        <div className="bg-card sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-sf-card">
          <div className="p-4 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide">Reserva tu cita</h2>
              {services.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {services.length} servicios disponibles
                </span>
              )}
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
      </section>

      {/* ─── SERVICIOS ────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <SectionHeader icon={<Scissors className="h-5 w-5 text-primary" />} title="Servicios" />

        {services.length === 0 ? (
          <EmptyState
            icon={<Scissors className="h-8 w-8 text-ink-faint" />}
            title="Catálogo en actualización"
            description="Pronto verás nuestros servicios aquí."
          />
        ) : (
          <div className="mt-5 space-y-2.5">
            {services.map((svc) => {
              const cat = categoryStyle(svc.category)
              return (
                <div
                  key={svc.id}
                  className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sf-card transition-smooth"
                >
                  {/* Icono / imagen del servicio */}
                  {svc.imageUrl ? (
                    <Image
                      src={svc.imageUrl}
                      alt={svc.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl', cat.iconTint)}>
                      {cat.emoji}
                    </span>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate font-semibold">{svc.name}</p>
                      <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', cat.chip)}>
                        {cat.label}
                      </span>
                    </div>
                    {svc.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{svc.description}</p>
                    )}
                  </div>

                  {/* Duración + precio */}
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg tracking-wide text-foreground">{formatCop(svc.priceCop)}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(svc.durationMin)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ─── EQUIPO ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-4 py-4 pb-16">
        <SectionHeader icon={<Star className="h-5 w-5 text-primary" />} title="Nuestro equipo" />

        {barbers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-ink-faint" />}
            title="Equipo en formación"
            description="Pronto conocerás a nuestros profesionales."
          />
        ) : (
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {barbers.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sf-card transition-smooth"
              >
                {/* Avatar */}
                <Avatar className="h-14 w-14 shrink-0">
                  {b.avatarUrl && (
                    <AvatarImage
                      src={b.avatarUrl}
                      alt={b.displayName}
                      loading={i === 0 ? 'eager' : undefined}
                    />
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
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── TESTIMONIOS ─────────────────────────────────────── */}
      <ReviewsSection reviews={reviews} />

      {/* ─── CTA bottom ───────────────────────────────────────── */}
      <div className="border-t border-border bg-card-soft py-10 text-center">
        <a
          href="#reservar"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sf-selected transition-smooth"
        >
          Reservar cita ahora →
        </a>
        <p className="mt-4 text-xs text-ink-faint">
          Powered by <span className="font-semibold text-muted-foreground">Citavek</span>
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
      <div className="ml-2 h-px flex-1 bg-border" />
    </div>
  )
}
