import { signOutAction } from '@/modules/identity/actions'

export default function SinBarberia() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">✂️</span>
      <h1 className="text-2xl font-bold">Aún no tienes una barbería</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tu cuenta existe pero no está asignada a ninguna barbería. Contacta al administrador de BookingFlow.
      </p>
      <form action={signOutAction}>
        <button type="submit" className="text-sm text-primary hover:underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
