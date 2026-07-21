-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('BARBERSHOP', 'BEAUTY_SALON');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'BARBERSHOP';
