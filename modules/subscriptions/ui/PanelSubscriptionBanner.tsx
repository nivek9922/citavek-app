import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { deriveSubscriptionView, type SubscriptionSnapshot } from '@/modules/subscriptions/domain/subscription'
import { supportWhatsAppLink } from '@/shared/constants/billing'

const BANNER_BASE = 'sticky top-0 z-50 px-4 py-2.5 text-center text-sm font-medium'

/**
 * Banner de estado de suscripción para el header del panel del owner.
 * No bloquea la lectura del historial — solo informa. Devuelve null si todo está al día.
 */
export function PanelSubscriptionBanner({
  subscription,
  tenantName,
}: {
  subscription: SubscriptionSnapshot | null
  tenantName:   string
}) {
  const banner = deriveSubscriptionView(subscription, new Date())
  if (!banner) return null

  const link = (label: string, message: string) => (
    <a
      href={supportWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {label}
    </a>
  )

  if (banner.level === 'suspended') {
    return (
      <div className={`${BANNER_BASE} bg-destructive text-destructive-foreground`}>
        Tu cuenta está suspendida. No se pueden crear nuevas citas.{' '}
        {link('Contáctanos por WhatsApp', `Hola, soy de ${tenantName} y quiero reactivar mi suscripción de Citavek.`)}
      </div>
    )
  }

  if (banner.level === 'grace') {
    const dias = banner.daysLeft === 1 ? 'día' : 'días'
    return (
      <div className={`${BANNER_BASE} bg-orange-500 text-orange-950`}>
        Tu suscripción venció. Tienes {banner.daysLeft} {dias} para regularizar antes de que se suspenda el servicio.{' '}
        {link('Pagar / Contactar', `Hola, soy de ${tenantName} y quiero regularizar mi pago de Citavek.`)}
      </div>
    )
  }

  // trialEnding
  return (
    <div className={`${BANNER_BASE} bg-yellow-400 text-yellow-950`}>
      Tu período de prueba vence el {format(banner.until, "d 'de' MMMM", { locale: es })}. Contáctanos para continuar.{' '}
      {link('Hablar por WhatsApp', `Hola, soy de ${tenantName} y quiero continuar con Citavek tras mi prueba.`)}
    </div>
  )
}
