import Link from 'next/link'
import { SignUpForm } from '@/modules/identity/ui/SignUpForm'

export const metadata = { title: 'Registra tu barbería — Citavek' }

export default function RegistroPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Cabecera */}
        <div className="text-center">
          <h1 className="font-display text-4xl tracking-wide text-primary">Citavek</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu barbería con reservas online en minutos
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-6 text-lg font-semibold">Crea tu cuenta y barbería</h2>
          <SignUpForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
