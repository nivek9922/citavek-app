'use client'
import { useState, useTransition } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { getCustomerStrikesAction, forgiveStrikeAction } from '../actions'
import type { StrikeRecord } from '../domain/no-show'

interface Props {
  customerPhone: string
  customerName: string
  tenantSlug: string
}

export function RiskBadge({ customerPhone, customerName, tenantSlug }: Props) {
  const [open, setOpen] = useState(false)
  const [strikes, setStrikes] = useState<StrikeRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgiving, startForgiving] = useTransition()

  async function loadStrikes() {
    setLoading(true)
    try {
      const data = await getCustomerStrikesAction(tenantSlug, customerPhone)
      setStrikes(data)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (value && strikes === null) {
      void loadStrikes()
    }
  }

  function handleForgive(strikeId: string) {
    startForgiving(async () => {
      const res = await forgiveStrikeAction(tenantSlug, { strikeId, note: null })
      if (res.ok) {
        toast.success('Strike perdonado.')
        const updated = await getCustomerStrikesAction(tenantSlug, customerPhone)
        setStrikes(updated)
      } else {
        toast.error(res.error)
      }
    })
  }

  const activeStrikes = strikes?.filter((s) => !s.forgiven) ?? []

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          title={`${activeStrikes.length > 0 ? activeStrikes.length : ''} no-show${activeStrikes.length !== 1 ? 's' : ''} en los últimos 90 días`}
          className="flex items-center gap-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 text-orange-400 hover:bg-orange-500/20 transition-colors"
        >
          <ShieldAlert className="h-3 w-3" aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-400" />
            {customerName}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Cargando strikes…'
              : strikes === null
              ? ''
              : activeStrikes.length === 0
              ? 'No tiene strikes activos en los últimos 90 días.'
              : `${activeStrikes.length} no-show${activeStrikes.length !== 1 ? 's' : ''} activo${activeStrikes.length !== 1 ? 's' : ''} en los últimos 90 días.`}
          </p>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && strikes && strikes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {strikes.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    s.forgiven
                      ? 'border-border bg-muted/30 text-muted-foreground'
                      : 'border-orange-500/20 bg-orange-500/5'
                  }`}
                >
                  <span>
                    {format(new Date(s.createdAt), "d 'de' MMM yyyy", { locale: es })}
                    {s.forgiven && <span className="ml-2 text-xs">(perdonado)</span>}
                  </span>
                  {!s.forgiven && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={forgiving}
                      onClick={() => handleForgive(s.id)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Perdonar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
