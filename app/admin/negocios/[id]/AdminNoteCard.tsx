'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { getOrgDetailsAction, saveAdminNoteAction } from '@/modules/tenancy/actions'

export function AdminNoteCard({ orgId }: { orgId: string }) {
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    let active = true
    getOrgDetailsAction(orgId).then((res) => {
      if (!active) return
      if (res.ok) setNote(res.data.adminNote ?? '')
      setLoading(false)
    })
    return () => { active = false }
  }, [orgId])

  function save() {
    startSaving(async () => {
      const res = await saveAdminNoteAction(orgId, note)
      if (res.ok) toast.success('Nota guardada.')
      else        toast.error(res.error)
    })
  }

  return (
    <section id="notas" className="scroll-mt-24 rounded-2xl border border-border bg-card/40 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Notas internas</h2>
      </div>
      <p className="text-[11px] text-muted-foreground/70">
        Solo visible para el Súper Admin. No se comparte con el negocio.
      </p>

      {loading ? (
        <div className="h-28 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Llamar el viernes para confirmar suscripción…"
            rows={5}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-border bg-card/60 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {saving ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>) : 'Guardar nota'}
          </button>
        </>
      )}
    </section>
  )
}
