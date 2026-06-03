import Link from 'next/link'
import { getTenantContext }  from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'
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
  const ctx = await getTenantContext(slug)
  const { member, session } = await requireMembership(ctx.id)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Color swatch del tenant */}
              <div className="h-7 w-7 rounded-lg bg-primary" />
              <span className="font-semibold">{ctx.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/${slug}`} target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
                Ver página →
              </Link>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {session.user.email}
              </span>
              <form action={signOutAction}>
                <button type="submit"
                  className="text-xs text-muted-foreground hover:text-foreground transition-smooth">
                  Salir
                </button>
              </form>
            </div>
          </div>
          {/* Navegación de secciones */}
          <PanelNav slug={slug} role={member.role} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
