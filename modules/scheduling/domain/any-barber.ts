/** Sentinel usado cuando el cliente elige "El primero disponible" en el booking.
 *  El action lo resuelve al primer barbero activo con disponibilidad en ese slot. */
export const ANY_BARBER_ID = 'any' as const
export type  AnyBarberId   = typeof ANY_BARBER_ID

export function isAnyBarber(id: string): id is AnyBarberId {
  return id === ANY_BARBER_ID
}
