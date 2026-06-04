// Helpers para enlaces de confirmación de cita (sin deps externas, server-safe).

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

interface CalendarEvent {
  title:        string
  description?: string
  location?:    string
  start:        Date
  end:          Date
}

/** Fecha en formato ICS UTC básico: 20260607T140000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(s: string): string {
  return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

/** Genera un data-URI .ics descargable para "Agregar al calendario". */
export function buildIcsDataUri(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookingFlow//ES',
    'BEGIN:VEVENT',
    `UID:${icsDate(new Date())}-${Math.random().toString(36).slice(2)}@bookingflow`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.start)}`,
    `DTEND:${icsDate(event.end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : '',
    event.location ? `LOCATION:${icsEscape(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}
