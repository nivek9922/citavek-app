import { getTenantContext } from '@/server/tenant'

export default async function PanelPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const ctx = await getTenantContext(slug)

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Panel — {ctx.name}</h1>
      <p className="mt-2 text-muted-foreground">Dashboard próximamente.</p>
    </main>
  )
}
