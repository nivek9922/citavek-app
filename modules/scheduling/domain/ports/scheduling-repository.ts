// Port (interface) del dominio. La implementa un Adapter en infrastructure/.
// No conoce Prisma ni ninguna tecnología concreta.

import type { AppointmentStatusValue, AppointmentSourceValue } from '../appointment'
import type { WorkingHourInput, BusySlot } from '../slot-calculator'

export type { WorkingHourInput, BusySlot }

export interface BookableService {
  priceCop:    number
  durationMin: number
}

export interface ReschedulableAppointment {
  status:    AppointmentStatusValue
  serviceId: string
  barberId:  string
}

/** Vista de cita para el portal del cliente (sin datos sensibles del negocio). */
export interface CustomerAppointment {
  id:             string
  organizationId: string  // necesario para mutaciones internas del dominio
  status:         AppointmentStatusValue
  startAt:        Date
  endAt:          Date
  customerName:   string
  service:        { name: string; durationMin: number; priceCop: number }
  barber:         { displayName: string; nickname: string | null }
  organization:   { name: string; slug: string; timezone: string; phone: string | null }
  notes?:         string | null
}

export interface NewAppointment {
  organizationId:  string
  serviceId:       string
  barberId:        string
  customerId:      string
  customerName:    string
  customerPhone:   string
  startAt:         Date
  endAt:           Date
  durationMin:     number
  priceCop:        number
  status:          AppointmentStatusValue
  source:          AppointmentSourceValue
  createdByUserId?: string | null
  notes?:           string | null
  isOffHours?:      boolean
}

export interface SchedulingRepository {
  /** Servicio reservable del tenant (precio/duración los manda el servidor). */
  getBookableService(organizationId: string, serviceId: string): Promise<BookableService | null>

  /** ¿El barbero pertenece al tenant y está activo? */
  isActiveBarber(organizationId: string, barberId: string): Promise<boolean>

  /**
   * ¿Hay solape con otra cita activa del barbero en ese rango?
   * `excludeAppointmentId` excluye la cita que se está reprogramando para evitar
   * que se detecte a sí misma como conflicto.
   */
  hasConflict(
    organizationId: string,
    barberId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<boolean>

  /** Crea o actualiza el cliente por teléfono dentro del tenant. */
  upsertCustomer(organizationId: string, name: string, phone: string): Promise<{ id: string }>

  createAppointment(data: NewAppointment): Promise<{ id: string }>

  /** Datos mínimos de una cita para validar un cambio de estado. */
  getAppointmentForStatusChange(
    organizationId: string,
    appointmentId: string,
  ): Promise<{ status: AppointmentStatusValue; startAt: Date } | null>

  updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    status: AppointmentStatusValue,
    cancelledAt: Date | null,
  ): Promise<void>

  /** Zona horaria IANA del tenant (e.g. "America/Bogota"). */
  getOrgTimezone(organizationId: string): Promise<string>

  /** Horarios laborales del barbero (almacenados en hora local). */
  getBarberWorkingHours(organizationId: string, barberId: string): Promise<WorkingHourInput[]>

  /**
   * Citas activas del barbero que solapan con el día indicado (ventana UTC ±24 h).
   * computeAvailableSlots filtra la ventana exacta por TZ, así que ser sobre-inclusivo es correcto.
   */
  getBarberBusySlots(organizationId: string, barberId: string, forDate: Date): Promise<BusySlot[]>

  /** Datos mínimos de una cita para validar si se puede reprogramar. */
  getAppointmentForReschedule(
    organizationId: string,
    appointmentId: string,
  ): Promise<ReschedulableAppointment | null>

  /** Actualiza el horario de una cita tras validar todas las reglas de negocio. */
  updateAppointmentTime(
    organizationId: string,
    appointmentId: string,
    newStartAt: Date,
    newEndAt: Date,
  ): Promise<void>

  /**
   * ¿Está bloqueado ese día para el barbero?
   * Comprueba también excepciones globales de la org (barberId = null).
   * `dateStr` es YYYY-MM-DD en la zona horaria del tenant.
   */
  isDateBlocked(organizationId: string, barberId: string, dateStr: string): Promise<boolean>

  /** Bloquea un día para un barbero (o para toda la org si barberId es null). */
  blockDate(
    organizationId: string,
    barberId: string | null,
    dateStr: string,
    reason?: string | null,
  ): Promise<void>

  /** Elimina el bloqueo de un día (no falla si no existía). */
  unblockDate(
    organizationId: string,
    barberId: string | null,
    dateStr: string,
  ): Promise<void>

  /**
   * Busca una cita por ID verificando que el teléfono del cliente coincida.
   * Devuelve null tanto si no existe como si el teléfono no coincide —
   * no revela si el ID es válido (privacidad por diseño).
   */
  getAppointmentForCustomer(
    appointmentId: string,
    customerPhone: string,
  ): Promise<CustomerAppointment | null>
}
