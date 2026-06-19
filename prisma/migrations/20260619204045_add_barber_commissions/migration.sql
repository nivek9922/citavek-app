-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED_PER_SERVICE');

-- CreateTable
CREATE TABLE "barber_commission" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "percentage" INTEGER,
    "fixedAmount" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "barber_commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_settlement" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "grossRevenueCop" INTEGER NOT NULL,
    "commissionCop" INTEGER NOT NULL,
    "appointmentCount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barber_commission_barberId_key" ON "barber_commission"("barberId");

-- CreateIndex
CREATE INDEX "barber_commission_organizationId_idx" ON "barber_commission"("organizationId");

-- CreateIndex
CREATE INDEX "commission_settlement_organizationId_barberId_idx" ON "commission_settlement"("organizationId", "barberId");

-- CreateIndex
CREATE INDEX "commission_settlement_organizationId_periodStart_idx" ON "commission_settlement"("organizationId", "periodStart");

-- AddForeignKey
ALTER TABLE "barber_commission" ADD CONSTRAINT "barber_commission_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_commission" ADD CONSTRAINT "barber_commission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_settlement" ADD CONSTRAINT "commission_settlement_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_settlement" ADD CONSTRAINT "commission_settlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
