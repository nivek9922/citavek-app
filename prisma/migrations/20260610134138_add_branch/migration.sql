-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "barber" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_organizationId_idx" ON "branch"("organizationId");

-- CreateIndex
CREATE INDEX "appointment_branchId_startAt_idx" ON "appointment"("branchId", "startAt");

-- CreateIndex
CREATE INDEX "barber_branchId_idx" ON "barber"("branchId");

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber" ADD CONSTRAINT "barber_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Data Migration: crear "Sede Principal" y backfill ───────────────────────

-- 1. Una "Sede Principal" por cada organización existente
INSERT INTO "branch" ("id", "organizationId", "name", "isDefault", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "id",
  'Sede Principal',
  true,
  NOW(),
  NOW()
FROM "organization";

-- 2. Apuntar todos los barberos existentes a la Sede Principal de su organización
UPDATE "barber" b
SET "branchId" = br."id"
FROM "branch" br
WHERE br."organizationId" = b."organizationId"
  AND br."isDefault" = true;

-- 3. Propagar branchId a las citas existentes (snapshot desde el barbero)
UPDATE "appointment" a
SET "branchId" = b."branchId"
FROM "barber" b
WHERE a."barberId" = b."id"
  AND b."branchId" IS NOT NULL;
