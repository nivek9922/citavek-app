'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'

interface Props {
  slug:         string
  initialQuery: string
}

export function CustomerSearch({ slug, initialQuery }: Props) {
  const router                       = useRouter()
  const searchParams                 = useSearchParams()
  const [value, setValue]            = useState(initialQuery)
  const [isPending, startTransition] = useTransition()
  const debounceRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sincroniza con navegación back/forward sin useEffect: patrón oficial de React
  // de "ajustar estado durante el render" cuando un valor externo (la URL) cambia.
  const urlQuery = searchParams.get('q') ?? ''
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery)
    setValue(urlQuery)
  }

  function handleChange(raw: string) {
    setValue(raw)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (raw.trim()) params.set('q', raw.trim())
      else            params.delete('q')
      startTransition(() => {
        router.replace(`/${slug}/panel/clientes?${params.toString()}`)
      })
    }, 300)
  }

  function clear() {
    setValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    startTransition(() => {
      router.replace(`/${slug}/panel/clientes`)
    })
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        aria-label="Buscar clientes"
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : value
            ? <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            : null
        }
      </div>
    </div>
  )
}
