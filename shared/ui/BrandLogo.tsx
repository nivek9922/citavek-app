import { cn } from '@/shared/ui/utils'

// Wordmark de marca "Citavek" — estilo lujo minimalista (tipografía display,
// tracking amplio, color de marca). Componente de presentación reutilizable
// para las vistas de autenticación globales. Sin lógica de negocio.

const sizes = {
  sm: 'text-3xl',
  lg: 'text-4xl',
} as const

export function BrandLogo({
  subtitle,
  size = 'lg',
  className,
}: {
  subtitle?: string
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <div className={cn('text-center', className)}>
      <span
        className={cn(
          'font-display font-normal uppercase tracking-[0.18em] text-primary',
          sizes[size],
        )}
      >
        Citavek
      </span>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
