import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, LogOut } from 'lucide-react'
import { getTenantContextPermissive } from '@/server/tenant'
import { requireMembership }          from '@/server/auth-guards'
import { signOutAction }     from '@/modules/identity/actions'
import { PanelNav }          from '@/modules/identity/ui/PanelNav'

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContextPermissive(slug)
  if (!ctx) notFound()
  const { member, session } = await requireMembership(ctx.id)
  const initial = ctx.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[256px_1fr]">

      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          {ctx.branding.logoUrl ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-xl">
              <Image src={ctx.branding.logoUrl} alt={ctx.name} fill unoptimized priority className="object-contain" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-base font-bold text-primary-foreground">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{ctx.name}</p>
            <p className="text-xs text-muted-foreground">Panel de gestión</p>
          </div>
        </div>

        <PanelNav slug={slug} role={member.role} variant="sidebar" />

        <div className="mt-auto space-y-1 border-t border-border p-3">
          <Link
            href={`/${slug}`}
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Ver página pública
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </button>
          </form>
          <p className="truncate px-3 pt-1 text-[11px] text-muted-foreground">{session.user.email}</p>
        </div>
      </aside>

      {/* ── Columna principal ── */}
      <div className="flex min-h-screen flex-col">

        {/* Banner de cuenta suspendida */}
        {ctx.status === 'suspended' && (
          <div className="sticky top-0 z-50 bg-destructive px-4 py-2.5 text-center text-sm font-medium text-destructive-foreground">
            Tu cuenta está suspendida por falta de pago. Tus clientes no pueden agendar nuevas citas.{' '}
            <span className="underline underline-offset-2">Contacta a soporte.</span>
          </div>
        )}

        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              {ctx.branding.logoUrl ? (
                <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                  <Image src={ctx.branding.logoUrl} alt={ctx.name} fill unoptimized priority className="object-contain" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {initial}
                </div>
              )}
              <span className="font-semibold">{ctx.name}</span>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="text-xs text-muted-foreground transition-smooth hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
          <div className="px-2">
            <PanelNav slug={slug} role={member.role} variant="tabs" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
