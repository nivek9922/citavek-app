import Link from 'next/link'
import { LoginForm } from '@/modules/identity/ui/LoginForm'

export const metadata = { title: 'Iniciar sesión — Citavek' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / marca */}
        <div className="text-center">
          <h1 className="font-display text-4xl tracking-wide text-primary">Citavek</h1>
          <p className="mt-1 text-sm text-muted-foreground">Panel de gestión para barberías</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-5 text-lg font-semibold">Iniciar sesión</h2>
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-primary hover:underline">
            Registra tu barbería
          </Link>
        </p>
      </div>
    </div>
  )
}
