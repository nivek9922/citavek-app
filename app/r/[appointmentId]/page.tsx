import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { rateLimit, clientIpFrom } from '@/server/rate-limit'
import { getReviewPageData } from '@/modules/reviews/queries'
import { ReviewForm } from '@/modules/reviews/ui/ReviewForm'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>
}) {
  // Página pública consultable por ID: límite por IP para frenar enumeración
  // de citas (los IDs son cuid, pero defensa en profundidad no sobra).
  const ip = clientIpFrom(await headers())
  if (!await rateLimit(`review-page:${ip}`, 30, 60_000)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Demasiadas solicitudes</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Espera un momento e inténtalo de nuevo.
        </p>
      </div>
    )
  }

  const { appointmentId } = await params
  const data = await getReviewPageData(appointmentId)

  if (!data) notFound()

  if (data.review) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Esta cita ya tiene una reseña</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Gracias por tomarte el tiempo de compartir tu opinión.
        </p>
      </div>
    )
  }

  if (data.status !== 'completed') {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-semibold">Esta cita aún no está completada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Podrás dejar tu reseña una vez finalizado el servicio.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <h1 className="mb-6 text-center text-xl font-bold">Califica tu experiencia</h1>
      <ReviewForm data={data} />
    </div>
  )
}
