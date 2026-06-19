-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('FREE_NEXT_VISIT', 'DISCOUNT_PCT', 'DISCOUNT_AMOUNT', 'FREE_SERVICE');

-- CreateTable
CREATE TABLE "loyalty_program" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiredVisits" INTEGER NOT NULL DEFAULT 5,
    "rewardType" "RewardType" NOT NULL,
    "discountPct" INTEGER,
    "discountAmount" INTEGER,
    "freeServiceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_card" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "rewardsEarned" INTEGER NOT NULL DEFAULT 0,
    "rewardPending" BOOLEAN NOT NULL DEFAULT false,
    "lastVisitAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_redemption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "discountCop" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_program_organizationId_key" ON "loyalty_program"("organizationId");

-- CreateIndex
CREATE INDEX "loyalty_card_organizationId_idx" ON "loyalty_card"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_card_organizationId_customerPhone_key" ON "loyalty_card"("organizationId", "customerPhone");

-- CreateIndex
CREATE INDEX "loyalty_redemption_organizationId_createdAt_idx" ON "loyalty_redemption"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "loyalty_program" ADD CONSTRAINT "loyalty_program_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_program" ADD CONSTRAINT "loyalty_program_freeServiceId_fkey" FOREIGN KEY ("freeServiceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_card" ADD CONSTRAINT "loyalty_card_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemption" ADD CONSTRAINT "loyalty_redemption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
