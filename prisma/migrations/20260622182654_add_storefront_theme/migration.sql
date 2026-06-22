-- CreateEnum
CREATE TYPE "StorefrontThemeMode" AS ENUM ('DARK', 'LIGHT', 'AUTO');

-- AlterTable
ALTER TABLE "branding" ADD COLUMN     "storefrontTheme" "StorefrontThemeMode" NOT NULL DEFAULT 'DARK';
