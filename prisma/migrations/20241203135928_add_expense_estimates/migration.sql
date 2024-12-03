/*
  Warnings:

  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `travelers` on table `TripPlan` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BankConnection" DROP CONSTRAINT "BankConnection_userId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_tripPlanId_fkey";

-- AlterTable
ALTER TABLE "TripPlan" ALTER COLUMN "travelers" SET NOT NULL,
ALTER COLUMN "travelers" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Expense";

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "preBooked" BOOLEAN NOT NULL DEFAULT false,
    "cost" DOUBLE PRECISION,
    "budgetType" TEXT NOT NULL,
    "budgetValue" DOUBLE PRECISION NOT NULL,
    "defaultPercentage" DOUBLE PRECISION NOT NULL,
    "isTracked" BOOLEAN NOT NULL DEFAULT true,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedTier" TEXT NOT NULL DEFAULT 'medium',
    "estimates" JSONB,
    "dailySpending" JSONB,
    "transactions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_tripPlanId_key_idx" ON "ExpenseCategory"("tripPlanId", "key");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "TripPlan_userId_idx" ON "TripPlan"("userId");

-- CreateIndex
CREATE INDEX "TripPlan_status_idx" ON "TripPlan"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
