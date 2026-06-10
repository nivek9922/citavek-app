import { Star } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import type { TopReviewDTO } from '../queries'

export function ReviewsSection({ reviews }: { reviews: TopReviewDTO[] }) {
  if (reviews.length === 0) return null

  return (
    <section className="mx-auto max-w-2xl px-4 py-4 pb-16">
      <div className="flex items-center gap-2.5 mb-5">
        <Star className="h-5 w-5 fill-primary text-primary" />
        <h2 className="font-display text-3xl tracking-wide">Lo que dicen nuestros clientes</h2>
        <div className="flex-1 h-px bg-border ml-2" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reviews.map((review) => (
          <Card key={review.id} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex gap-0.5 mb-3" aria-label="5 estrellas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-4">
                &ldquo;{review.comment}&rdquo;
              </p>
              <p className="mt-3 text-sm font-medium">— {review.customerName}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
