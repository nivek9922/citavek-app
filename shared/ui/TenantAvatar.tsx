import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar'
import { cn } from '@/shared/ui/utils'

// Avatar/logo de un tenant (barbería): si hay logoUrl muestra la imagen, si es
// null genera un fallback con la inicial del nombre sobre fondo de marca.
// Encapsula la lógica que estaba duplicada en el panel y la vista pública.
// La forma (tamaño, redondeado, ring…) se controla por className.

export function TenantAvatar({
  name,
  logoUrl,
  className,
  fallbackClassName,
}: {
  name: string
  logoUrl: string | null
  className?: string
  fallbackClassName?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <Avatar className={cn('h-10 w-10', className)}>
      {logoUrl && <AvatarImage src={logoUrl} alt={name} className="object-contain" />}
      <AvatarFallback
        className={cn(
          'bg-primary/10 font-display font-bold text-primary',
          fallbackClassName,
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
