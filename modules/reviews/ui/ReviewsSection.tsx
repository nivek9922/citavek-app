import { Star } from 'lucide-react'
import type { TopReviewDTO } from '../queries'

export function ReviewsSection({ reviews }: { reviews: TopReviewDTO[] }) {
  if (reviews.length === 0) return null

  return (
    <section className="mx-auto max-w-2xl px-4 py-4 pb-16">
      <div className="mb-5 flex items-center gap-2.5">
        <Star className="h-5 w-5 fill-primary text-primary" />
        <h2 className="font-display text-3xl tracking-wide">Lo que dicen nuestros clientes</h2>
        <div className="ml-2 h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-border bg-card p-5 shadow-sf-card">
            <div className="mb-3 flex gap-0.5" aria-label="5 estrellas">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="line-clamp-4 text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{review.comment}&rdquo;
            </p>
            <p className="mt-3 text-sm font-semibold">— {review.customerName}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
