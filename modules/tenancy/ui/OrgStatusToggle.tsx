'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { setOrgStatusAction } from '../actions'

interface Props {
  orgId:          string
  status:         'active' | 'suspended'
  onStatusChange: (orgId: string, newStatus: 'active' | 'suspended') => void
}

export function OrgStatusToggle({ orgId, status, onStatusChange }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function toggle() {
    if (pending) return
    const next = status === 'active' ? 'suspended' : 'active'
    setError(null)
    setPending(true)
    const res = await setOrgStatusAction(orgId, next)
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onStatusChange(orgId, next)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={
          status === 'active'
            ? 'flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed'
            : 'flex items-center gap-1.5 rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed'
        }
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === 'active' ? 'Suspender' : 'Activar'}
      </button>
      {error && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
    </div>
  )
}
