import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const country = searchParams.get('country');
    const tier = searchParams.get('tier');
    const days = parseInt(searchParams.get('days') || '30');

    const historicalData = await prisma.estimateHistory.findMany({
      where: {
        ...(category && { category }),
        ...(country && { country }),
        ...(tier && { tier }),
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            votes: true
          }
        }
      }
    });

    // Calculate statistics
    const stats = historicalData.reduce((acc, estimate) => {
      if (!acc[estimate.category]) {
        acc[estimate.category] = {
          count: 0,
          avgCost: 0,
          minCost: Infinity,
          maxCost: -Infinity,
          avgConfidence: 0
        };
      }

      const cat = acc[estimate.category];
      cat.count++;
      cat.avgCost += estimate.avgCost;
      cat.minCost = Math.min(cat.minCost, estimate.minCost);
      cat.maxCost = Math.max(cat.maxCost, estimate.maxCost);
      cat.avgConfidence += estimate.confidence;

      return acc;
    }, {});

    // Finalize averages
    Object.values(stats).forEach(cat => {
      cat.avgCost /= cat.count;
      cat.avgConfidence /= cat.count;
    });

    return NextResponse.json({
      estimates: historicalData,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching historical estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
} 