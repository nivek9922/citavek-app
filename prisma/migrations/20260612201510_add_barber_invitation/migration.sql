-- CreateTable
CREATE TABLE "barber_invitation" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barber_invitation_token_key" ON "barber_invitation"("token");

-- CreateIndex
CREATE INDEX "barber_invitation_token_idx" ON "barber_invitation"("token");

-- CreateIndex
CREATE INDEX "barber_invitation_barberId_idx" ON "barber_invitation"("barberId");

-- AddForeignKey
ALTER TABLE "barber_invitation" ADD CONSTRAINT "barber_invitation_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_invitation" ADD CONSTRAINT "barber_invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
