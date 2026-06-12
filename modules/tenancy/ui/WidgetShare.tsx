'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Link2 } from 'lucide-react'

interface Props {
  tenantSlug: string
}

export function WidgetShare({ tenantSlug }: Props) {
  const origin     = typeof window !== 'undefined' ? window.location.origin : 'https://citavek.app'
  const directUrl  = `${origin}/${tenantSlug}`
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(directUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Compartir página de reservas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comparte este link en Instagram, WhatsApp, Google Business o donde tus clientes te encuentren.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium">Tu link de reservas</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <span className="flex-1 truncate font-mono text-sm text-foreground">
            {directUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary"
          >
            {copied
              ? <><CheckCircle2 className="h-4 w-4 text-green-500" /> Copiado</>
              : <><Copy className="h-4 w-4" /> Copiar</>
            }
          </button>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground text-xs uppercase tracking-wide">Úsalo en:</p>
          <ul className="space-y-1 list-disc list-inside text-sm">
            <li>Bio de Instagram o TikTok</li>
            <li>Mensaje fijo de WhatsApp Business</li>
            <li>Google Business Profile</li>
            <li>Linktree o cualquier bio link</li>
          </ul>
        </div>

        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir página de reservas
        </a>
      </div>
    </div>
  )
}
