import Link from 'next/link'
import { signOutAction } from '@/modules/identity/actions'

export default function SinBarberia() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-5xl">✂️</span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Aún no tienes una barbería</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu cuenta existe pero no está vinculada a ninguna barbería.
        </p>
      </div>

      <Link
        href="/registro"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
      >
        Crear mi barbería
      </Link>

      <form action={signOutAction}>
        <button type="submit" className="text-sm text-muted-foreground hover:text-primary hover:underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
