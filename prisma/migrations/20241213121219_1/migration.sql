/*
  Warnings:

  - You are about to drop the column `avgCost` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `maxCost` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `minCost` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `estimate_history` table. All the data in the column will be lost.
  - You are about to drop the column `travelers` on the `estimate_history` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tripPlanId,category]` on the table `estimate_history` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "estimate_history_category_country_travelers_idx";

-- AlterTable
ALTER TABLE "estimate_history" DROP COLUMN "avgCost",
DROP COLUMN "confidence",
DROP COLUMN "country",
DROP COLUMN "maxCost",
DROP COLUMN "minCost",
DROP COLUMN "source",
DROP COLUMN "travelers",
ADD COLUMN     "estimates" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "estimate_history_tripPlanId_category_key" ON "estimate_history"("tripPlanId", "category");
