import type { ReactNode } from 'react'

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-4 py-12">
        {children}
      </main>
    </div>
  )
}
