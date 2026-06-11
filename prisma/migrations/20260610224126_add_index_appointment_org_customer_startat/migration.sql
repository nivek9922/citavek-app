-- CreateIndex
CREATE INDEX "appointment_organizationId_customerId_startAt_idx" ON "appointment"("organizationId", "customerId", "startAt");
