/*
  Warnings:

  - You are about to drop the `trip_plans` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DepartureLocation" DROP CONSTRAINT "DepartureLocation_tripPlanId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseCategory" DROP CONSTRAINT "ExpenseCategory_tripPlanId_fkey";

-- DropForeignKey
ALTER TABLE "trip_plans" DROP CONSTRAINT "trip_plans_userId_fkey";

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "estimates" JSONB;

-- DropTable
DROP TABLE "trip_plans";

-- CreateTable
CREATE TABLE "TripPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "country" TEXT,
    "city" JSONB,
    "cities" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "travelers" INTEGER,
    "currency" TEXT,
    "overallBudget" DOUBLE PRECISION,
    "selectedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripPlan_userId_idx" ON "TripPlan"("userId");

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartureLocation" ADD CONSTRAINT "DepartureLocation_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
