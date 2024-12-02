/*
  Warnings:

  - Added the required column `name` to the `TripPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "preBooked" SET DEFAULT false;

-- AlterTable
ALTER TABLE "TripPlan" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "travelers" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "overallBudget" DROP NOT NULL;
