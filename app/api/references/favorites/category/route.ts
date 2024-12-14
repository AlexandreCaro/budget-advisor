import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Fetch favorites with trip data
    const favorites = await prisma.favoriteReference.findMany({
      where: {
        userId: session.user.id,
        category
      },
      include: {
        tripPlan: {
          select: {
            name: true,
            currency: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedFavorites = favorites.map(fav => ({
      id: fav.id,
      name: fav.name,
      price: fav.price,
      description: fav.description,
      url: fav.url,
      tier: fav.tier,
      status: fav.status,
      createdAt: fav.createdAt,
      tripName: fav.tripPlan.name,
      tripId: fav.tripPlanId,
      currency: fav.tripPlan.currency
    }));

    return NextResponse.json(formattedFavorites);
  } catch (error) {
    console.error('Error fetching category favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
} 