-- appointment_service.serviceId pasa de RESTRICT a CASCADE on delete.
-- Los servicios solo se borran en duro al desmantelar toda la org
-- (Organization→Service es Cascade); en el flujo normal se desactivan.
-- Con RESTRICT, el borrado de la org chocaba con esta FK al eliminar
-- servicios y citas en paralelo. CASCADE elimina ese conflicto de orden.

-- DropForeignKey
ALTER TABLE "appointment_service" DROP CONSTRAINT "appointment_service_serviceId_fkey";

-- AddForeignKey
ALTER TABLE "appointment_service" ADD CONSTRAINT "appointment_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
