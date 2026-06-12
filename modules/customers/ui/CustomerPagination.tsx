'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface Props {
  currentPage:  number
  totalPages:   number
  total:        number
  slug:         string
}

export function CustomerPagination({ currentPage, totalPages, total, slug }: Props) {
  const router                       = useRouter()
  const searchParams                 = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function navigate(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) params.set('page', String(page))
    else          params.delete('page')
    startTransition(() => {
      router.replace(`/${slug}/panel/clientes?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <p className="text-sm text-muted-foreground">
        {isPending
          ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
          : <>{total} {total === 1 ? 'cliente' : 'clientes'} — página {currentPage} de {totalPages}</>
        }
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || isPending}
          onClick={() => navigate(currentPage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || isPending}
          onClick={() => navigate(currentPage + 1)}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
