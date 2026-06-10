export interface ReminderParams {
  customerName:  string
  formattedTime: string
  barberName:    string
  shopName:      string
}

export function buildReminderMessage(p: ReminderParams): string {
  return (
    `¡Hola ${p.customerName}! Te recordamos tu cita de hoy a las ${p.formattedTime} ` +
    `con ${p.barberName} en ${p.shopName}. ¡Te esperamos! 💈 ` +
    `Si tienes algún contratiempo, por favor avísanos por este medio.`
  )
}

// Convierte E.164 (+573104567890) al formato dígito-solo que espera wa.me (573104567890).
// Números locales colombianos (10 dígitos) reciben el prefijo 57.
export function sanitizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '57' + digits
  return digits
}
