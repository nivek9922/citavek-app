import { headers } from 'next/headers'
import { Scissors, AlertCircle } from 'lucide-react'
import { prismaStaffRepository as repo } from '@/modules/staff/infrastructure/prisma-staff-repository'
import { validateInviteToken } from '@/modules/staff/application/register-from-invite'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import { RegisterBarberForm } from './RegisterBarberForm'
import { BrandLogo } from '@/shared/ui/BrandLogo'

export const metadata = { title: 'Registro de barbero — Citavek' }

export default async function InvitePage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const hdrs = await headers()
  const ip   = clientIpFrom(hdrs)
  const ok   = await rateLimit(`invite:${ip}`, 20, 60_000)
  if (!ok) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <BrandLogo />
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold text-destructive">Demasiados intentos</h1>
            <p className="text-sm text-muted-foreground">
              Has realizado demasiadas solicitudes. Espera un minuto e intenta de nuevo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const result = await validateInviteToken(repo, token)

  if ('error' in result) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <BrandLogo />
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="text-lg font-semibold text-destructive">Invitación no válida</h1>
            <p className="text-sm text-muted-foreground">{result.error}</p>
            <p className="text-xs text-muted-foreground">
              Pídele a tu empleador que genere un nuevo enlace de invitación.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        <BrandLogo subtitle={`Únete al equipo de ${result.orgName}`} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <Scissors className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">{result.barberName}</p>
              <p className="text-xs text-muted-foreground">{result.orgName}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Crea tu cuenta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Completa el formulario para acceder al panel de tu barbería.
            </p>
          </div>

          <RegisterBarberForm
            token={token}
            barberName={result.barberName}
            orgName={result.orgName}
          />
        </div>

      </div>
    </div>
  )
}
