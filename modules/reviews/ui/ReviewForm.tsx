'use client'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button }     from '@/shared/ui/button'
import { Textarea }   from '@/shared/ui/textarea'
import { StarRating } from './StarRating'
import { submitReviewAction } from '../actions'
import type { ReviewPageData } from '../queries'

interface Props {
  data: ReviewPageData
}

export function ReviewForm({ data }: Props) {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const barberName = data.barber.nickname ?? data.barber.displayName.split(' ')[0]!

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return
    setStatus('submitting')
    startTransition(async () => {
      const res = await submitReviewAction({
        appointmentId: data.id,
        rating,
        comment: comment.trim() || null,
      })
      if (res.ok) {
        setStatus('done')
      } else {
        setErrorMsg(res.error)
        setStatus('error')
      }
    })
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-400" />
        <h2 className="text-2xl font-bold">¡Gracias por tu reseña!</h2>
        <p className="text-muted-foreground">
          Tu opinión ayuda a mejorar el servicio de {barberName}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Barbero */}
      <div className="flex flex-col items-center gap-3">
        {data.barber.avatarUrl ? (
          <Image
            src={data.barber.avatarUrl}
            alt={data.barber.displayName}
            width={80}
            height={80}
            unoptimized
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary border-2 border-primary/20">
            {data.barber.displayName.charAt(0)}
          </div>
        )}
        <div className="text-center">
          <p className="text-lg font-semibold">{data.barber.displayName}</p>
          <p className="text-sm text-muted-foreground">{data.serviceName}</p>
        </div>
      </div>

      {/* Calificación */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {rating === 0 ? '¿Cómo calificarías el servicio?' : `${rating} de 5 estrellas`}
        </p>
        <StarRating value={rating} onChange={setRating} size="md" />
      </div>

      {/* Comentario */}
      <div className="space-y-1.5">
        <Textarea
          placeholder="¿Algo que quieras destacar? (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          className="resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-center text-sm text-destructive">{errorMsg}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={rating === 0 || isPending}
      >
        {isPending ? 'Enviando…' : 'Enviar reseña'}
      </Button>
    </form>
  )
}
