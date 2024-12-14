import { prisma } from "@/lib/prisma";
import { median, mean, standardDeviation, quantile } from "simple-statistics";

interface HistoricalStats {
  median: number;
  mean: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierThreshold: number;
}

export async function processHistoricalData(
  category: string,
  country: string,
  tier: string,
  timeRange: { start: Date; end: Date }
) {
  // Fetch historical data
  const historicalData = await prisma.estimateHistory.findMany({
    where: {
      category,
      country,
      tier,
      createdAt: {
        gte: timeRange.start,
        lte: timeRange.end
      },
      isOutlier: false // Exclude previously marked outliers
    },
    include: {
      votes: true // Include votes for confidence calculation
    }
  });

  if (historicalData.length < 5) {
    console.log('Insufficient historical data for statistical analysis');
    return null;
  }

  // Extract cost arrays
  const costs = {
    min: historicalData.map(d => d.minCost),
    max: historicalData.map(d => d.maxCost),
    avg: historicalData.map(d => d.avgCost)
  };

  // Calculate statistics for each cost type
  const stats = {
    min: calculateStats(costs.min),
    max: calculateStats(costs.max),
    avg: calculateStats(costs.avg)
  };

  // Identify outliers
  const outliers = identifyOutliers(historicalData, stats);
  
  // Mark outliers in database
  if (outliers.length > 0) {
    await prisma.estimateHistory.updateMany({
      where: {
        id: {
          in: outliers.map(o => o.id)
        }
      },
      data: {
        isOutlier: true
      }
    });
  }

  // Calculate confidence based on data consistency and votes
  const confidence = calculateConfidence(historicalData, stats);

  // Calculate final estimates excluding outliers
  const validData = historicalData.filter(d => !outliers.find(o => o.id === d.id));
  
  return {
    estimates: {
      min: median(validData.map(d => d.minCost)),
      max: median(validData.map(d => d.maxCost)),
      avg: median(validData.map(d => d.avgCost)),
      confidence
    },
    stats,
    outlierCount: outliers.length,
    sampleSize: historicalData.length
  };
}

function calculateStats(values: number[]): HistoricalStats {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  
  return {
    median: median(values),
    mean: mean(values),
    stdDev: standardDeviation(values),
    q1,
    q3,
    iqr,
    outlierThreshold: iqr * 1.5
  };
}

function identifyOutliers(data: any[], stats: any) {
  return data.filter(d => {
    const avgStats = stats.avg;
    const distance = Math.abs(d.avgCost - avgStats.median);
    return distance > avgStats.outlierThreshold;
  });
}

function calculateConfidence(data: any[], stats: any): number {
  // Base confidence on several factors
  const factors = {
    // Data consistency (how close to the median)
    consistency: data.reduce((sum, d) => {
      const normalizedDistance = Math.abs(d.avgCost - stats.avg.median) / stats.avg.stdDev;
      return sum + (1 / (1 + normalizedDistance));
    }, 0) / data.length,

    // Vote ratio (positive votes / total votes)
    votes: data.reduce((sum, d) => {
      const totalVotes = d.votes.length;
      if (totalVotes === 0) return sum + 0.5;
      const positiveVotes = d.votes.filter((v: any) => v.isPositive).length;
      return sum + (positiveVotes / totalVotes);
    }, 0) / data.length,

    // Sample size factor
    sampleSize: Math.min(1, data.length / 20) // Max confidence at 20+ samples
  };

  // Weighted average of confidence factors
  return (
    factors.consistency * 0.4 +
    factors.votes * 0.3 +
    factors.sampleSize * 0.3
  );
} 