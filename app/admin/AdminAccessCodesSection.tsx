'use client'
import { useState, useTransition } from 'react'
import { KeyRound, Plus, Check, Clock, XCircle, Copy } from 'lucide-react'
import { Button }   from '@/shared/ui/button'
import { Input }    from '@/shared/ui/input'
import { Label }    from '@/shared/ui/label'
import { cn }       from '@/shared/ui/utils'
import { generateAccessCodeAction } from '@/modules/identity/actions'
import type { AccessCodeRecord } from '@/modules/identity/domain/ports/identity-repository'

interface Props {
  initialCodes: AccessCodeRecord[]
}

export function AdminAccessCodesSection({ initialCodes }: Props) {
  const [codes,      setCodes]      = useState(initialCodes)
  const [expiryDays, setExpiryDays] = useState(30)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  function handleGenerate() {
    setError('')
    startTransition(async () => {
      const res = await generateAccessCodeAction({ expiryDays })
      if (!res.ok) { setError(res.error); return }
      setCodes((prev) => [{
        id:        res.code,
        code:      res.code,
        isUsed:    false,
        usedBy:    null,
        usedAt:    null,
        expiresAt: new Date(Date.now() + expiryDays * 86_400_000),
        createdAt: new Date(),
        createdBy: '',
      }, ...prev])
    })
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const available = codes.filter((c) => !c.isUsed && new Date(c.expiresAt) > new Date())
  const used      = codes.filter((c) => c.isUsed)
  const expired   = codes.filter((c) => !c.isUsed && new Date(c.expiresAt) <= new Date())

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Códigos de acceso</h2>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {available.length} disponibles
        </span>
      </div>

      {/* Generador */}
      <div className="flex items-end gap-3 rounded-2xl border border-border bg-card/60 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="expiryDays">Vence en (días)</Label>
          <Input
            id="expiryDays"
            type="number"
            min={1}
            max={365}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="w-24"
            disabled={isPending}
          />
        </div>
        <Button onClick={handleGenerate} disabled={isPending} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Generar código
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Lista */}
      {codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay códigos generados.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const isExpired = !c.isUsed && new Date(c.expiresAt) <= new Date()
            const status = c.isUsed ? 'used' : isExpired ? 'expired' : 'available'

            return (
              <div
                key={c.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                  status === 'available' && 'border-border bg-card',
                  status === 'used'      && 'border-border/50 bg-muted/30 opacity-60',
                  status === 'expired'   && 'border-orange-500/30 bg-orange-500/5 opacity-60',
                )}
              >
                {status === 'available' && <Check   className="h-4 w-4 shrink-0 text-green-500" />}
                {status === 'used'      && <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                {status === 'expired'   && <Clock   className="h-4 w-4 shrink-0 text-orange-400" />}

                <span className="font-mono font-semibold tracking-widest">{c.code}</span>

                <span className="ml-auto text-xs text-muted-foreground">
                  {status === 'available' && `Vence ${new Date(c.expiresAt).toLocaleDateString('es-CO')}`}
                  {status === 'used'      && `Usado por ${c.usedBy ?? '—'}`}
                  {status === 'expired'   && 'Vencido'}
                </span>

                {status === 'available' && (
                  <button
                    type="button"
                    onClick={() => copyCode(c.code)}
                    className="text-muted-foreground transition-smooth hover:text-foreground"
                    title="Copiar código"
                  >
                    {copied === c.code
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <Copy className="h-4 w-4" />
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{available.length} disponibles</span>
        <span>{used.length} usados</span>
        {expired.length > 0 && <span className="text-orange-400">{expired.length} vencidos</span>}
      </div>
    </section>
  )
}
