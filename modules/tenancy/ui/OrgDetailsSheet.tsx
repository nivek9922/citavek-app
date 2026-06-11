'use client'

import { useState }       from 'react'
import { Phone, Mail, MessageCircle, Loader2, Check } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/shared/ui/sheet'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { getOrgDetailsAction, saveAdminNoteAction, type OrgDetails } from '@/modules/tenancy/actions'

interface Props {
  orgId:    string
  orgName:  string
  branding: { primaryColor: string } | null
}

export function OrgDetailsSheet({ orgId, orgName, branding }: Props) {
  const [open,    setOpen]    = useState(false)
  const [details, setDetails] = useState<OrgDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (newOpen && !details) {
      setLoading(true)
      const res = await getOrgDetailsAction(orgId)
      if (res.ok) {
        setDetails(res.data)
        setNote(res.data.adminNote ?? '')
      }
      setLoading(false)
    }
  }

  async function handleSaveNote() {
    setSaving(true)
    setError(null)
    const res = await saveAdminNoteAction(orgId, note)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(res.error)
    }
    setSaving(false)
  }

  const total    = (details?.onlineCount ?? 0) + (details?.manualCount ?? 0)
  const onlinePct = total > 0 ? Math.round(((details?.onlineCount ?? 0) / total) * 100) : 0

  let adoptionLabel = ''
  if (total > 0) {
    if (onlinePct >= 60)      adoptionLabel = 'Usando bien el link de reservas'
    else if (onlinePct >= 30) adoptionLabel = 'Uso mixto — puede mejorar'
    else                      adoptionLabel = 'Baja adopción — mayormente manual'
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-xs transition-smooth hover:border-primary/50 hover:text-primary"
        >
          Detalles
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-xl border border-border">
              <AvatarFallback
                style={{ backgroundColor: branding?.primaryColor ?? '#E0A300' }}
                className="rounded-xl text-white font-bold text-sm"
              >
                {orgName[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <SheetTitle className="text-base">{orgName}</SheetTitle>
          </div>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && details && (
          <div className="space-y-7">

            {/* ── Contacto ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contacto
              </h3>

              {details.ownerName && (
                <p className="text-sm font-medium">{details.ownerName}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {details.phone && (
                  <a
                    href={`https://wa.me/57${details.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp {details.phone}
                  </a>
                )}

                {details.ownerEmail && (
                  <a
                    href={`mailto:${details.ownerEmail}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {details.ownerEmail}
                  </a>
                )}

                {!details.phone && !details.ownerEmail && (
                  <p className="text-xs text-muted-foreground">Sin datos de contacto registrados.</p>
                )}

                {details.phone && !details.ownerEmail && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {details.phone}
                  </span>
                )}
              </div>
            </section>

            {/* ── Ratio de Uso ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ratio de Uso
              </h3>

              {total === 0 ? (
                <p className="text-xs text-muted-foreground">Sin citas registradas aún.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Online (clientes)</span>
                    <span className="font-medium tabular-nums">{details.onlineCount} <span className="text-muted-foreground">({onlinePct}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${onlinePct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Manual (barbero)</span>
                    <span className="font-medium tabular-nums">{details.manualCount} <span className="text-muted-foreground">({100 - onlinePct}%)</span></span>
                  </div>

                  {adoptionLabel && (
                    <p className={`mt-1 text-xs font-medium ${
                      onlinePct >= 60 ? 'text-green-400'
                        : onlinePct >= 30 ? 'text-yellow-400'
                        : 'text-orange-400'
                    }`}>
                      {adoptionLabel}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Notas internas ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notas Internas
              </h3>
              <p className="text-[11px] text-muted-foreground/70">
                Solo visible para el Súper Admin. No se comparte con el negocio.
              </p>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Llamar el viernes para confirmar suscripción…"
                rows={5}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
                ) : saved ? (
                  <><Check className="h-3.5 w-3.5 text-green-400" /> <span className="text-green-400">Guardado</span></>
                ) : (
                  'Guardar nota'
                )}
              </button>
            </section>

          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
