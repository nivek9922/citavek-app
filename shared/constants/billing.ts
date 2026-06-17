// Constantes de facturación y soporte (Fase 1: suscripción manual).

/** WhatsApp de soporte/ventas de Citavek (sin '+', formato wa.me). */
export const SUPPORT_WHATSAPP = '573026889618'

/** Link de WhatsApp con mensaje opcional pre-cargado. */
export function supportWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Precio mensual del plan básico, en COP (pesos). Usado para la proyección de MRR. */
export const BASIC_PRICE_COP = 79_900

/** Etiquetas legibles de los planes. */
export const PLAN_LABELS: Record<'basic' | 'pro', string> = {
  basic: 'Básico',
  pro:   'Pro',
}
