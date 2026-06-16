// Función pura — sin deps de framework ni DB.
// Valida la selección de servicios y calcula los totales server-side.
import type { BookableService, NewAppointmentService } from './ports/scheduling-repository'

export interface ResolvedServices {
  lines:            NewAppointmentService[]
  totalDurationMin: number
  totalPriceCop:    number
}

/**
 * Cruza los serviceIds pedidos por el cliente contra los servicios reservables
 * (activos) que devolvió el repo, preservando el orden pedido y deduplicando.
 * Calcula la duración y el precio TOTAL en el servidor — nunca se confía en el
 * cliente. Devuelve null si la lista viene vacía o si algún id no es reservable
 * (inexistente/inactivo/ajeno al tenant).
 */
export function resolveSelectedServices(
  requestedIds: string[],
  bookable: BookableService[],
): ResolvedServices | null {
  if (requestedIds.length === 0) return null

  const byId = new Map(bookable.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const lines: NewAppointmentService[] = []

  for (const id of requestedIds) {
    if (seen.has(id)) continue
    const svc = byId.get(id)
    if (!svc) return null // un id pedido no es reservable → selección inválida
    seen.add(id)
    lines.push({ serviceId: svc.id, priceCop: svc.priceCop, durationMin: svc.durationMin })
  }

  return {
    lines,
    totalDurationMin: lines.reduce((sum, l) => sum + l.durationMin, 0),
    totalPriceCop:    lines.reduce((sum, l) => sum + l.priceCop, 0),
  }
}
