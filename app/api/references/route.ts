import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Create user reference
    const reference = await prisma.userReference.create({
      data: {
        userId: session.user.id,
        category: data.category,
        country: data.country,
        name: data.name,
        price: data.price,
        description: data.description,
        url: data.url,
        tier: data.tier,
      }
    });

    // Also create an estimate history entry with high confidence
    await prisma.estimateHistory.create({
      data: {
        category: data.category,
        country: data.country,
        travelers: 1, // Default to 1
        startDate: new Date(),
        endDate: new Date(),
        tier: data.tier,
        minCost: data.price * 0.9, // Add some variance
        maxCost: data.price * 1.1,
        avgCost: data.price,
        confidence: 1.0, // High confidence for user data
        source: 'User Contributed',
        currency: data.currency,
        references: [{
          name: data.name,
          url: data.url,
          price: data.price,
          description: data.description
        }]
      }
    });

    return NextResponse.json(reference);
  } catch (error) {
    console.error('Error adding reference:', error);
    return NextResponse.json(
      { error: 'Failed to add reference' },
      { status: 500 }
    );
  }
} 