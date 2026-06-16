'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import { COLOMBIA_CITIES } from '@/shared/constants/colombia-cities'

interface Props {
  total:    number
  filtered: number
}

export function AdminFilters({ total, filtered }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()

  const push = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value && value !== 'all') {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Búsqueda por nombre o slug */}
      <div className="relative w-full sm:min-w-48 sm:flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o slug…"
          className="pl-9"
          defaultValue={params.get('q') ?? ''}
          onChange={(e) => push('q', e.target.value)}
        />
      </div>

      {/* Filtro por estado */}
      <Select
        defaultValue={params.get('status') ?? 'all'}
        onValueChange={(v) => push('status', v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activas</SelectItem>
          <SelectItem value="suspended">Suspendidas</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro por ciudad — lista estática Colombia */}
      <Select
        defaultValue={params.get('city') ?? 'all'}
        onValueChange={(v) => push('city', v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Ciudad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las ciudades</SelectItem>
          {COLOMBIA_CITIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {filtered} de {total}
      </span>
    </div>
  )
}
