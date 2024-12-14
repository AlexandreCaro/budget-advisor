-- CreateTable
CREATE TABLE "estimate_history" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "travelers" TEXT NOT NULL,
    "minCost" DOUBLE PRECISION NOT NULL,
    "maxCost" DOUBLE PRECISION NOT NULL,
    "avgCost" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_history_tripPlanId_idx" ON "estimate_history"("tripPlanId");

-- CreateIndex
CREATE INDEX "estimate_history_category_country_travelers_idx" ON "estimate_history"("category", "country", "travelers");

-- AddForeignKey
ALTER TABLE "estimate_history" ADD CONSTRAINT "estimate_history_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
