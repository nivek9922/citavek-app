-- CreateIndex
CREATE INDEX "barber_invitation_organizationId_idx" ON "barber_invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_inviterId_idx" ON "invitation"("inviterId");

-- CreateIndex
CREATE INDEX "loyalty_program_freeServiceId_idx" ON "loyalty_program"("freeServiceId");

-- CreateIndex
CREATE INDEX "review_barberId_idx" ON "review"("barberId");

-- CreateIndex
CREATE INDEX "schedule_exception_barberId_idx" ON "schedule_exception"("barberId");
