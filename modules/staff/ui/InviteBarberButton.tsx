'use client'
import { useState, useTransition } from 'react'
import { Link2, Copy, Check, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/shared/ui/dialog'
import { useVocabulary } from '@/shared/ui/vocabulary-provider'
import { generateBarberInviteAction } from '../actions'

interface Props {
  tenantSlug:  string
  barberId:    string
  barberName:  string
}

export function InviteBarberButton({ tenantSlug, barberId, barberName }: Props) {
  const v = useVocabulary()
  const [open,      setOpen]      = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateBarberInviteAction(tenantSlug, barberId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setInviteUrl(res.inviteUrl)
      setOpen(true)
    })
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const firstName = barberName.split(' ')[0]
  const waText    = encodeURIComponent(
    `Hola ${firstName}! 👋 Aquí está tu enlace para unirte al panel de Citavek:\n${inviteUrl}\n\nExpira en 72 horas.`,
  )

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={isPending}
        title={`Invitar ${v.professionalSingularLower}`}
        className="rounded-lg p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth sm:p-1.5"
      >
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Mail className="h-4 w-4" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              Invitar a {firstName}
            </DialogTitle>
            <DialogDescription>
              Comparte este enlace. Expira en 72 horas.
            </DialogDescription>
          </DialogHeader>

          {inviteUrl && (
            <div className="space-y-3">
              {/* URL box */}
              <div className="relative rounded-xl border border-border bg-muted/40 p-3 pr-9">
                <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {inviteUrl}
                </p>
                <button
                  onClick={handleCopy}
                  title="Copiar"
                  className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-smooth"
                >
                  {copied
                    ? <Check className="h-3.5 w-3.5 text-green-400" />
                    : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied
                    ? <><Check className="h-3.5 w-3.5 text-green-400" /> Copiado</>
                    : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                </Button>
                <Button size="sm" asChild className="gap-1.5 bg-[#25D366] hover:bg-[#20bb58] text-white">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
