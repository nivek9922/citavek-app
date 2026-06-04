-- CreateTable
CREATE TABLE "schedule_exception" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "barberId" TEXT,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_exception_organizationId_date_idx" ON "schedule_exception"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exception_organizationId_barberId_date_key" ON "schedule_exception"("organizationId", "barberId", "date");

-- AddForeignKey
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exception" ADD CONSTRAINT "schedule_exception_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
