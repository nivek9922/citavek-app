import { getTenantContext } from '@/server/tenant'
import { requireMembership } from '@/server/auth-guards'

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)
  const { member } = await requireMembership(ctx.id)

  return (
    <div data-role={member.role} className="min-h-screen">
      {children}
    </div>
  )
}
