'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/shared/ui/utils'

interface Props {
  value:     number
  onChange?: (v: number) => void
  readonly?: boolean
  size?:     'sm' | 'md'
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: Props) {
  const [hovered, setHovered] = useState(0)

  const dim = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  const active = hovered > 0 ? hovered : value

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn(
            'transition-colors',
            readonly ? 'cursor-default' : 'cursor-pointer',
          )}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              dim,
              active >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  )
}
