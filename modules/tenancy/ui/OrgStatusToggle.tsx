'use client'

import { useTransition } from 'react'
import { setOrgStatusAction } from '../actions'

interface Props {
  orgId:  string
  status: 'active' | 'suspended'
}

export function OrgStatusToggle({ orgId, status }: Props) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = status === 'active' ? 'suspended' : 'active'
    startTransition(async () => { await setOrgStatusAction(orgId, next) })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={
        status === 'active'
          ? 'rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50'
          : 'rounded-lg border border-green-500/40 px-3 py-1.5 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/10 disabled:opacity-50'
      }
    >
      {isPending ? '…' : status === 'active' ? 'Suspender' : 'Activar'}
    </button>
  )
}
