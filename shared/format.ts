const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCop(amount: number): string {
  return copFormatter.format(amount)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

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

export function sanitizePhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '57' + digits
  return digits
}
