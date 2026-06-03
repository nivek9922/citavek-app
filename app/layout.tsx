import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BookingFlow — Software para barberías',
  description: 'Reservas online y gestión para barberías en Colombia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
