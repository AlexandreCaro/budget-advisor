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
    
    const favorite = await prisma.favoriteReference.create({
      data: {
        userId: session.user.id,
        tripPlanId: data.tripPlanId,
        category: data.category,
        name: data.name,
        price: data.price,
        description: data.description,
        url: data.url,
        tier: data.tier,
        status: 'SAVED'
      }
    });

    return NextResponse.json(favorite);
  } catch (error) {
    console.error('Error saving favorite:', error);
    return NextResponse.json(
      { error: 'Failed to save favorite' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get('tripId');
    const category = searchParams.get('category');

    const favorites = await prisma.favoriteReference.findMany({
      where: {
        userId: session.user.id,
        tripPlanId: tripId!,
        ...(category && { category })
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
} 