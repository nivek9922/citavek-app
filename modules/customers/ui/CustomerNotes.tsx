'use client'
import { useRef, useState } from 'react'
import { StickyNote, Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateCustomerNotesAction } from '../actions'

interface Props {
  slug:       string
  customerId: string
  initialNotes: string | null
}

export function CustomerNotes({ slug, customerId, initialNotes }: Props) {
  const [editing, setEditing] = useState(false)
  const [notes,   setNotes]   = useState(initialNotes ?? '')
  const [saved,   setSaved]   = useState(initialNotes ?? '')
  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function openEdit() {
    setEditing(true)
    setTimeout(() => ref.current?.focus(), 0)
  }

  function cancel() {
    setNotes(saved)
    setEditing(false)
    setError('')
  }

  async function save() {
    setPending(true)
    setError('')
    const res = await updateCustomerNotesAction(slug, customerId, notes)
    setPending(false)
    if (res.ok) {
      setSaved(notes)
      setEditing(false)
    } else {
      setError(res.error ?? 'Error al guardar.')
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <StickyNote className="h-4 w-4" /> Notas internas
      </h2>

      <div className="rounded-2xl border border-border bg-card p-4">
        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={ref}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Añade una nota sobre este cliente…"
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-smooth hover:opacity-90 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Guardar
              </button>
              <button
                onClick={cancel}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-smooth hover:bg-accent disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
              <span className="ml-auto text-xs text-muted-foreground">{notes.length}/500</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            {saved ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{saved}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin notas. Haz clic en editar para añadir una.</p>
            )}
            <button
              onClick={openEdit}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground"
              title="Editar notas"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
