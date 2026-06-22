-- CreateTable
CREATE TABLE "no_show_policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "strikeThreshold" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "no_show_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_show_strike" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "forgiven" BOOLEAN NOT NULL DEFAULT false,
    "forgivenAt" TIMESTAMPTZ(6),
    "forgivenNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "no_show_strike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "no_show_policy_organizationId_key" ON "no_show_policy"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "no_show_strike_appointmentId_key" ON "no_show_strike"("appointmentId");

-- CreateIndex
CREATE INDEX "no_show_strike_organizationId_customerPhone_createdAt_idx" ON "no_show_strike"("organizationId", "customerPhone", "createdAt");

-- AddForeignKey
ALTER TABLE "no_show_policy" ADD CONSTRAINT "no_show_policy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_show_strike" ADD CONSTRAINT "no_show_strike_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_show_strike" ADD CONSTRAINT "no_show_strike_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
