-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('basic', 'pro');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'grace', 'suspended', 'cancelled');

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'basic',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMPTZ(6),
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "graceStartedAt" TIMESTAMPTZ(6),
    "lastPaymentAt" TIMESTAMPTZ(6),
    "lastPaymentAmount" INTEGER,
    "paymentMethod" TEXT,
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelReason" TEXT,
    "mpSubscriptionId" TEXT,
    "mpCustomerId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_organizationId_key" ON "subscription"("organizationId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_trialEndsAt_idx" ON "subscription"("trialEndsAt");

-- CreateIndex
CREATE INDEX "subscription_currentPeriodEnd_idx" ON "subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "subscription_status_graceStartedAt_idx" ON "subscription"("status", "graceStartedAt");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: toda organización existente sin suscripción entra en trial de 30 días.
-- Idempotente (WHERE NOT EXISTS) → seguro si se re-ejecuta. Las filas backfilled usan
-- gen_random_uuid()::text como id (cosmético vs cuid de la app; ambos son PK string únicas).
INSERT INTO "subscription" ("id", "organizationId", "plan", "status", "trialEndsAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", 'basic', 'trial', now() + interval '30 days', now(), now()
FROM "organization" o
WHERE NOT EXISTS (SELECT 1 FROM "subscription" s WHERE s."organizationId" = o."id");
