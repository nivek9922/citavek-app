'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/shared/ui/table'

/** Fila de tabla navegable: click en cualquier parte → push a `href`. */
export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <TableRow onClick={() => router.push(href)} className="cursor-pointer">
      {children}
    </TableRow>
  )
}
