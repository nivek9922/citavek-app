-- CreateTable
CREATE TABLE "access_code" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "access_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_code_code_key" ON "access_code"("code");

-- CreateIndex
CREATE INDEX "access_code_code_idx" ON "access_code"("code");

-- CreateIndex
CREATE INDEX "access_code_isUsed_expiresAt_idx" ON "access_code"("isUsed", "expiresAt");
