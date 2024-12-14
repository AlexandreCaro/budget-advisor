import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching trips for user:', session.user.id);

    const trips = await prisma.tripPlan.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        expenses: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`Found ${trips.length} trips`);
    return NextResponse.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
} 