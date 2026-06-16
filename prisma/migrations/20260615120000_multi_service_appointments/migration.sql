-- Multi-servicio por cita: Appointment.serviceId (FK singular) → tabla puente
-- appointment_service (1 línea por servicio, con snapshot de precio/duración).
-- Migración con BACKFILL: cada cita existente conserva su servicio como una
-- línea cuyo snapshot = el total snapshot que ya guardaba la cita.

-- CreateTable
CREATE TABLE "appointment_service" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceCop" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,

    CONSTRAINT "appointment_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_service_serviceId_idx" ON "appointment_service"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_service_appointmentId_serviceId_key" ON "appointment_service"("appointmentId", "serviceId");

-- AddForeignKey
ALTER TABLE "appointment_service" ADD CONSTRAINT "appointment_service_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_service" ADD CONSTRAINT "appointment_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: una línea por cita preexistente (snapshot = total actual de la cita).
INSERT INTO "appointment_service" ("id", "appointmentId", "serviceId", "priceCop", "durationMin")
SELECT gen_random_uuid()::text, "id", "serviceId", "priceCop", "durationMin"
FROM "appointment";

-- DropForeignKey
ALTER TABLE "appointment" DROP CONSTRAINT "appointment_serviceId_fkey";

-- AlterTable
ALTER TABLE "appointment" DROP COLUMN "serviceId";
