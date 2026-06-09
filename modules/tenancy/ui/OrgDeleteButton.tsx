'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { deleteOrgAction } from '../actions'

interface Props {
  orgId:        string
  slug:         string
  name:         string
  appointments: number
  barbers:      number
  onDelete:     (orgId: string) => void
}

export function OrgDeleteButton({ orgId, slug, name, appointments, barbers, onDelete }: Props) {
  const [open, setOpen]           = useState(false)
  const [confirmText, setConfirm] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const matches = confirmText.trim() === slug

  function close() {
    if (isPending) return
    setOpen(false)
    setConfirm('')
    setError(null)
  }

  async function handleDelete() {
    if (!matches) return
    setError(null)
    setIsPending(true)
    const res = await deleteOrgAction(orgId)
    setIsPending(false)
    if (!res.ok) { setError(res.error); return }
    onDelete(orgId)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Eliminar barbería (permanente)"
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        aria-label="Eliminar barbería"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Eliminar {name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esta acción es <strong className="text-foreground">permanente</strong>. Se borrarán{' '}
                  {appointments} {appointments === 1 ? 'cita' : 'citas'},{' '}
                  {barbers} {barbers === 1 ? 'barbero' : 'barberos'} y todos los datos de la barbería.
                  No se puede deshacer.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <label htmlFor="confirm-slug" className="text-sm text-muted-foreground">
                Escribe <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{slug}</code> para confirmar:
              </label>
              <Input
                id="confirm-slug"
                value={confirmText}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={slug}
                autoComplete="off"
                autoFocus
                className="font-mono focus-visible:ring-offset-0"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!matches || isPending}
              >
                {isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
