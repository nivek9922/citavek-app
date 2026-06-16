'use client'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/shared/ui/utils'

const STORAGE_KEY = 'citavek-theme'

/**
 * Toggle de tema light/dark. La clase `.dark` en <html> la fija el script de
 * hidratación de app/layout.tsx (sin flash); este botón solo la alterna y
 * persiste la preferencia. El ícono visible se decide por CSS (`dark:`) según la
 * clase actual — sin estado ni efecto, así que no hay mismatch de hidratación
 * ni se viola react-hooks/set-state-in-effect.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light') } catch { /* storage deshabilitado */ }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro u oscuro"
      title="Cambiar tema"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      {/* En dark se muestra el sol (→ ir a light); en light, la luna (→ ir a dark). */}
      <Sun  className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  )
}
