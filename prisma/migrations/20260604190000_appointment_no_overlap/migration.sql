-- Anti-solape de citas a NIVEL DE BASE DE DATOS: autoridad final contra dobles reservas.
--
-- El código de aplicación ya serializa por barbero con un advisory lock
-- (ver prisma-scheduling-repository.ts), pero esta exclusion constraint es la
-- garantía dura: la base de datos rechaza físicamente dos citas activas que se
-- solapen para el mismo barbero, pase lo que pase a nivel de aplicación.
--
-- Requiere la extensión btree_gist para combinar igualdad (barberId) con el
-- operador de solape de rangos (&&).
--
-- ⚠️  Esta migración aún no se ha aplicado. Para aplicarla:
--         npx prisma migrate deploy        (entornos / CI)
--     o   npx prisma migrate dev           (desarrollo local)
--
--     Como Prisma no modela exclusion constraints en el schema, en el siguiente
--     `migrate dev` puede reportar drift; resuélvelo con `prisma migrate resolve`
--     o documenta la constraint como introducida por SQL.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (
    "barberId" WITH =,
    tstzrange("startAt", "endAt") WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed'));
